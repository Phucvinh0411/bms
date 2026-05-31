package fit.iuh.ai_helper;

import fit.iuh.config.OllamaAIProperties;
import fit.iuh.semanticsearch.HybridSearchService;
import fit.iuh.semanticsearch.SemanticBookSearchDTO;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StopWatch;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;

@Service
public class AgentRouterService {

    private final RuleIntentDetector ruleDetector;
    private final LlmIntentAnalyzer llmAnalyzer;
    private final HybridSearchService bookSearchService; // "Tool" cứng để lục lọi DB sách
    private final RestClient restClient;
    private final OllamaAIProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public AgentRouterService(RuleIntentDetector ruleDetector,
                              LlmIntentAnalyzer llmAnalyzer,
                              HybridSearchService bookSearchService,
                              @Qualifier("chatRestClient") RestClient restClient,
                              OllamaAIProperties properties) {
        this.ruleDetector = ruleDetector;
        this.llmAnalyzer = llmAnalyzer;
        this.bookSearchService = bookSearchService;
        this.restClient = restClient;
        this.properties = properties;
    }

    /**
     * Hàm điều phối chính: Xử lý câu hỏi của User và trả về câu thoại của AI.
     * Đã tích hợp StopWatch profiling để đo đạc từng bước trong pipeline RAG.
     */
    public String routeAndExecute(String userMessage) {
        StopWatch sw = new StopWatch("RAG Agent Profiler");

        sw.start("0. Intent Detection (Rule + LLM)");
        IntentResponseDto extraction = resolveIntentResponse(userMessage);
        sw.stop();

        String systemPrompt = buildBaseSystemPrompt(extraction);

        if (Intent.BOOK_SEARCH.name().equalsIgnoreCase(extraction.getIntent())) {
            String cleanedKeyword = safeKeyword(extraction.getKeyword(), userMessage);
            BigDecimal maxPrice = extraction.getMaxPrice();
            List<SemanticBookSearchDTO> books;

            try {
                sw.start("1. Call Embedding API");
                float[] queryEmbedding = bookSearchService.generateQueryEmbedding(cleanedKeyword);
                sw.stop();

                sw.start("2. Execute Postgres Hybrid Search");
                books = bookSearchService.searchByVector(
                    bookSearchService.toVectorLiteral(queryEmbedding),
                    cleanedKeyword,
                    5,
                    0,
                    null,
                    null,
                    maxPrice
                );
                sw.stop();
            } catch (Exception exception) {
                if (sw.isRunning()) {
                    sw.stop();
                }
                System.out.println("Embedding/Hybrid search failed, fallback to text search: " + exception.getMessage());

                sw.start("2. Execute Postgres Hybrid Search");
                books = bookSearchService.searchByText(
                    cleanedKeyword,
                    5,
                    0,
                    null,
                    null,
                    maxPrice
                );
                sw.stop();
            }

            sw.start("3. Convert Entity to DTO and String Text");
            String textContext = buildBookContext(books);
            systemPrompt = buildRagPrompt(extraction, textContext);
            sw.stop();
        } else if (Intent.ORDER_CHECKING.name().equalsIgnoreCase(extraction.getIntent())) {
            systemPrompt = buildOrderCheckingPrompt(extraction);
        }

        sw.start("4. Call Chat API");
        String result = generateFinalResponse(systemPrompt, userMessage);
        sw.stop();

        System.out.println("\n" + sw.prettyPrint());
        System.out.printf(">>> TỔNG THỜI GIAN PIPELINE: %.3f giây%n%n", sw.getTotalTimeSeconds());

        return result;
    }

    /**
     * Giữ lại khả năng xuất text context cho dữ liệu sách đã được truy xuất.
     */
    public String performSemanticSearchToText(String userQuery) {
        List<SemanticBookSearchDTO> books = bookSearchService.hybridSearch(userQuery, 5, 0, null, null, null);
        return buildBookContext(books);
    }

    /**
     * Hàm phụ trợ: Tạo cấu trúc JSON Input và gửi sang Ollama endpoint /api/chat
     */
    private String generateFinalResponse(String systemPrompt, String userMessage) {
        String model = properties.getChatModel() == null || properties.getChatModel().isBlank()
            ? "qwen2.5"
            : properties.getChatModel().trim();

        var requestBody = new OllamaRequestDto(
            model,
            List.of(
                new OllamaMessageDto("system", systemPrompt),
                new OllamaMessageDto("user", userMessage)
            ),
            false
        );

        try {
            var response = restClient.post()
                .uri("/api/chat")
                .body(requestBody)
                .retrieve()
                .body(OllamaResponseDto.class);

            if (response != null && response.getMessage() != null) {
                String content = response.getMessage().getContent();
                if (content != null && !content.isBlank()) {
                    return content.trim();
                }
            }

        } catch (Exception e) {
            System.err.println("Lỗi kết nối API Ollama ở bước sinh câu trả lời: " + e.getMessage());
            return "Xin lỗi bạn, hệ thống xử lý AI của nhà sách đang bận xử lý. Bạn vui lòng thử lại sau giây lát!";
        }

        return "Hệ thống AI không đưa ra phản hồi.";
    }

    private IntentResponseDto resolveIntentResponse(String userMessage) {
        Optional<Intent> ruleIntent = ruleDetector.detect(userMessage);
        if (ruleIntent.isPresent()) {
            Intent intent = ruleIntent.get();
            if (Intent.BOOK_SEARCH.equals(intent)) {
                IntentResponseDto extracted = llmAnalyzer.analyzeWithLlm(userMessage);
                if (!Intent.BOOK_SEARCH.name().equalsIgnoreCase(extracted.getIntent())) {
                    extracted.setIntent(Intent.BOOK_SEARCH.name());
                }
                extracted.setKeyword(safeKeyword(extracted.getKeyword(), userMessage));
                return extracted;
            }
            return new IntentResponseDto(intent.name(), null, null);
        }

        return llmAnalyzer.analyzeWithLlm(userMessage);
    }

    private String buildBaseSystemPrompt(IntentResponseDto extraction) {
        String intent = extraction == null || extraction.getIntent() == null
            ? Intent.GENERAL_CHAT.name()
            : extraction.getIntent();

        return """
            Bạn là tư vấn viên ảo thân thiện, lịch sự của nhà sách.
            Hãy trả lời bằng tiếng Việt, ngắn gọn, tự nhiên và chính xác.
            Chỉ dùng dữ liệu thực tế được cung cấp trong ngữ cảnh.

            Intent đã trích xuất: %s
            """.formatted(intent);
    }

    private String buildOrderCheckingPrompt(IntentResponseDto extraction) {
        return buildBaseSystemPrompt(extraction) + "\n" + "Nếu khách đang hỏi đơn hàng, hãy yêu cầu họ cung cấp mã đơn hàng để hệ thống kiểm tra tiếp.";
    }

    private String buildRagPrompt(IntentResponseDto extraction, String textContext) {
        String keyword = extraction != null ? extraction.getKeyword() : null;
        String maxPrice = extraction != null && extraction.getMaxPrice() != null ? extraction.getMaxPrice().toPlainString() : "null";

        return """
            Bạn là tư vấn viên ảo thân thiện, lịch sự của nhà sách.
            Hãy trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, không bịa đặt dữ liệu.
            Chỉ được dựa trên ngữ cảnh sách bên dưới để tư vấn.

            Dữ liệu trích xuất:
            - intent: %s
            - keyword: %s
            - maxPrice: %s

            Ngữ cảnh sách thực tế:
            %s

            Quy tắc bắt buộc:
            - Nếu ngữ cảnh không có sách phù hợp, hãy nói rõ là chưa tìm thấy kết quả phù hợp.
            - Không tự thêm tên sách, tác giả hoặc giá tiền ngoài ngữ cảnh.
            - Ưu tiên gợi ý đúng theo keyword và maxPrice đã trích xuất.
            """.formatted(
                extraction != null && extraction.getIntent() != null ? extraction.getIntent() : Intent.BOOK_SEARCH.name(),
                keyword == null || keyword.isBlank() ? "null" : keyword,
                maxPrice,
                textContext
            );
    }

    private String buildBookContext(List<SemanticBookSearchDTO> books) {
        if (books == null || books.isEmpty()) {
            return "- Hiện không có sách nào khớp với truy vấn.";
        }

        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < books.size(); i++) {
            SemanticBookSearchDTO book = books.get(i);
            String priceText = book.price() == null ? "N/A" : book.price().stripTrailingZeros().toPlainString() + " VNĐ";
            String scoreText = book.combinedScore() == null ? "N/A" : String.format("%.4f", book.combinedScore());

            builder.append("- ID: ").append(book.id()).append('\n')
                .append("  Tên sách: ").append(safeText(book.title())).append('\n')
                .append("  Tác giả: ").append(safeText(book.author())).append('\n')
                .append("  Nhà xuất bản: ").append(safeText(book.publisher())).append('\n')
                .append("  Giá: ").append(priceText).append('\n')
                .append("  Danh mục: ").append(safeText(book.categoryName())).append('\n')
                .append("  Mô tả: ").append(safeText(book.description())).append('\n')
                .append("  Điểm tổng hợp: ").append(scoreText);

            if (i < books.size() - 1) {
                builder.append('\n');
            }
        }

        return builder.toString();
    }

    private String safeKeyword(String keyword, String fallbackMessage) {
        String cleaned = cleanText(keyword);
        if (cleaned != null) {
            return cleaned;
        }

        return cleanSearchFallback(fallbackMessage);
    }

    private String cleanSearchFallback(String fallbackMessage) {
        String fallback = cleanText(fallbackMessage);
        if (fallback == null) {
            return "";
        }

        String sanitized = fallback
            .replaceAll("(?i)^(cho tôi|giúp tôi|mình muốn|tôi muốn|mình tìm|tôi tìm|tìm|mua|có|cho em|cho anh|cho chị)\\s+", "")
            .replaceAll("(?i)\\b(dưới|không quá|tối đa|max|nhỏ hơn)\\b.*$", "")
            .replaceAll("(?i)\\b(sách|cuốn|quyển)\\b", "")
            .replaceAll("\\s{2,}", " ")
            .trim();

        return sanitized.isBlank() ? fallback : sanitized;
    }

    private String cleanText(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value
            .replaceAll("[\\r\\n\\t]+", " ")
            .replaceAll("\\s{2,}", " ")
            .trim();

        if (cleaned.isBlank()) {
            return null;
        }

        return cleaned;
    }

    private String safeText(String value) {
        return cleanText(value) == null ? "N/A" : cleanText(value);
    }

    /**
     * Streaming version: Gửi từng token qua callback thay vì đợi toàn bộ.
     */
    public void routeAndExecuteStreaming(String userMessage,
                                          List<OllamaMessageDto> history,
                                          Consumer<SseChunk> onChunk) {
        StopWatch sw = new StopWatch("RAG Streaming Profiler");

        // ─── Step 0: Intent Detection ───
        sw.start("0. Intent Detection");
        onChunk.accept(SseChunk.thinking("Đang phân tích câu hỏi..."));
        IntentResponseDto extraction = resolveIntentResponse(userMessage);
        sw.stop();

        String systemPrompt = buildBaseSystemPrompt(extraction);
        List<SemanticBookSearchDTO> foundBooks = List.of();

        if (Intent.BOOK_SEARCH.name().equalsIgnoreCase(extraction.getIntent())) {
            String cleanedKeyword = safeKeyword(extraction.getKeyword(), userMessage);
            BigDecimal maxPrice = extraction.getMaxPrice();

            // ─── Step 1+2: Embed + Search ───
            onChunk.accept(SseChunk.thinking("Đang tìm kiếm sách..."));
            sw.start("1+2. Hybrid Search");
            try {
                float[] queryEmbedding = bookSearchService.generateQueryEmbedding(cleanedKeyword);
                foundBooks = bookSearchService.searchByVector(
                    bookSearchService.toVectorLiteral(queryEmbedding),
                    cleanedKeyword, 5, 0, null, null, maxPrice
                );
            } catch (Exception e) {
                foundBooks = bookSearchService.searchByText(
                    cleanedKeyword, 5, 0, null, null, maxPrice
                );
            }
            sw.stop();

            // ─── Step 2.5: Gửi BookCards qua Generative UI ───
            if (!foundBooks.isEmpty()) {
                List<Map<String, Object>> bookCards = foundBooks.stream()
                    .map(this::toBookCard)
                    .toList();
                onChunk.accept(SseChunk.bookCards(bookCards));
            }

            sw.start("3. Build Context");
            String textContext = buildBookContext(foundBooks);
            systemPrompt = buildRagPrompt(extraction, textContext);
            sw.stop();
        } else if (Intent.ORDER_CHECKING.name().equalsIgnoreCase(extraction.getIntent())) {
            systemPrompt = buildOrderCheckingPrompt(extraction);
        }

        // ─── Step 4: Streaming Chat ───
        sw.start("4. Streaming Chat");
        streamChatResponse(systemPrompt, userMessage, history, onChunk);
        sw.stop();

        System.out.println("\n" + sw.prettyPrint());
    }

    private void streamChatResponse(String systemPrompt,
                                     String userMessage,
                                     List<OllamaMessageDto> history,
                                     Consumer<SseChunk> onChunk) {
        String model = properties.getChatModel() == null || properties.getChatModel().isBlank()
            ? "qwen2.5" : properties.getChatModel().trim();

        List<OllamaMessageDto> messages = new ArrayList<>();
        messages.add(new OllamaMessageDto("system", systemPrompt));
        if (history != null) {
            messages.addAll(history);
        }
        messages.add(new OllamaMessageDto("user", userMessage));

        var requestBody = new OllamaRequestDto(model, messages, true); // stream = TRUE

        try {
            restClient.post()
                .uri("/api/chat")
                .body(requestBody)
                .exchange((clientRequest, clientResponse) -> {
                    try (var reader = new BufferedReader(
                            new InputStreamReader(clientResponse.getBody(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.isBlank()) continue;
                            try {
                                OllamaResponseDto chunk = objectMapper.readValue(line, OllamaResponseDto.class);
                                if (chunk.getMessage() != null && chunk.getMessage().getContent() != null) {
                                    String token = chunk.getMessage().getContent();
                                    if (!token.isEmpty()) {
                                        onChunk.accept(SseChunk.text(token));
                                    }
                                }
                                if (chunk.isDone()) break;
                            } catch (Exception parseErr) {
                                // Skip malformed line
                            }
                        }
                    }
                    return null;
                });
        } catch (Exception e) {
            onChunk.accept(SseChunk.text("Xin lỗi, hệ thống AI đang bận. Vui lòng thử lại!"));
        }
    }

    private Map<String, Object> toBookCard(SemanticBookSearchDTO book) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", book.id());
        card.put("title", safeText(book.title()));
        card.put("author", safeText(book.author()));
        card.put("price", book.price() != null ? book.price().longValue() : 0);
        card.put("imageUrl", book.imageUrl() != null ? book.imageUrl() : "/placeholder-book.jpg");
        card.put("categoryName", safeText(book.categoryName()));
        card.put("score", book.combinedScore() != null ? book.combinedScore() : 0.0);
        return card;
    }
}
