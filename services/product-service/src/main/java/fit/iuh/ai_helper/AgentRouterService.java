package fit.iuh.ai_helper;

import fit.iuh.config.OpenRouterAIProperties;
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
    private final OpenRouterAIProperties properties;
    private final QueryRouterService queryRouter;
    private final CrossEncoderRerankerService crossReranker;
    private final LlmAsAJudgeService judgeService;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public AgentRouterService(RuleIntentDetector ruleDetector,
                              LlmIntentAnalyzer llmAnalyzer,
                              HybridSearchService bookSearchService,
                              @Qualifier("chatRestClient") RestClient restClient,
                              OpenRouterAIProperties properties,
                              QueryRouterService queryRouter,
                              CrossEncoderRerankerService crossReranker,
                              LlmAsAJudgeService judgeService) {
        this.ruleDetector = ruleDetector;
        this.llmAnalyzer = llmAnalyzer;
        this.bookSearchService = bookSearchService;
        this.restClient = restClient;
        this.properties = properties;
        this.queryRouter = queryRouter;
        this.crossReranker = crossReranker;
        this.judgeService = judgeService;
    }

    /**
     * Hàm điều phối chính: Xử lý câu hỏi của User và trả về câu thoại của AI.
     * Đã tích hợp StopWatch profiling để đo đạc từng bước trong pipeline RAG.
     */
    public String routeAndExecute(String userMessage) {
        StopWatch sw = new StopWatch("RAG Agent Profiler");

        // ─── BƯỚC 1: ADAPTIVE ROUTING ───
        sw.start("1. Adaptive Routing");
        RoutingResultDto route = queryRouter.routeQuery(userMessage);
        sw.stop();

        boolean isDeepPath = "DEEP".equalsIgnoreCase(route.routingPath());
        List<SemanticBookSearchDTO> finalBooks = List.of();

        // Định tuyến an toàn tuyệt đối (Fail-safe): Kiểm tra intent của router hoặc dùng rule detector bổ trợ
        String intentStr = route.intent() != null ? route.intent().toUpperCase() : "";
        boolean isBookSearch = intentStr.contains("TIM_SACH") 
                            || intentStr.contains("BOOK_SEARCH") 
                            || intentStr.contains("SACH") 
                            || intentStr.contains("BOOK")
                            || ruleDetector.detect(userMessage).filter(i -> i == Intent.BOOK_SEARCH).isPresent();

        if (isBookSearch) {
            // Lấy từ khóa chính thức từ router, fallback làm sạch từ khóa nếu trống
            String searchKeyword;
            if (route.extractedKeywords() != null && !route.extractedKeywords().isEmpty()) {
                searchKeyword = String.join(" ", route.extractedKeywords());
            } else {
                searchKeyword = safeKeyword(null, userMessage);
            }

            // ─── BƯỚC 2: RETRIEVAL (Lấy Top 30 sách) ───
            sw.start("2. Database Retrieval");
            List<SemanticBookSearchDTO> rawCandidates;
            try {
                float[] queryEmbedding = bookSearchService.generateQueryEmbedding(searchKeyword);
                rawCandidates = bookSearchService.searchByVector(
                    bookSearchService.toVectorLiteral(queryEmbedding),
                    searchKeyword, 30, 0, null, null, null
                );
            } catch (Exception e) {
                rawCandidates = bookSearchService.searchByText(searchKeyword, 30, 0, null, null, null);
            }
            sw.stop();

            // ─── BƯỚC 3: MULTI-STAGE RE-RANKING ───
            if (!rawCandidates.isEmpty()) {
                if (!isDeepPath) {
                    // FAST_PATH: Chạy Cross-Encoder lấy Top 5
                    sw.start("3a. Fast Cross-Encoder Reranking");
                    finalBooks = crossReranker.rerank(searchKeyword, rawCandidates, 5);
                    sw.stop();
                } else {
                    // DEEP_PATH: Cross-Encoder (Top 10) + LLM-as-a-Judge (Top 3)
                    sw.start("3b. Deep Multi-stage Reranking");
                    List<SemanticBookSearchDTO> top10 = crossReranker.rerank(searchKeyword, rawCandidates, 10);
                    finalBooks = judgeService.evaluateAndFilter(userMessage, top10);
                    sw.stop();
                }
            }
        }

        // ─── BƯỚC 4: CHAT GENERATION ───
        sw.start("4. Convert Context and Call Chat API");
        String textContext = buildBookContext(finalBooks);
        String finalSystemPrompt = buildRagPrompt(
            new IntentResponseDto(route.intent(), (route.extractedKeywords() != null ? String.join(", ", route.extractedKeywords()) : null), null), 
            textContext
        );
        String result = generateFinalResponse(finalSystemPrompt, userMessage);
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
     * Hàm phụ trợ: Tạo cấu trúc JSON Input và gửi sang OpenRouter endpoint /chat/completions
     */
    private String generateFinalResponse(String systemPrompt, String userMessage) {
        String model = properties.getChatModel() == null || properties.getChatModel().isBlank()
            ? "google/gemini-2.5-flash"
            : properties.getChatModel().trim();

        var requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userMessage)
            )
        );

        try {
            var response = restClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(OpenRouterChatResponse.class);

            if (response != null && response.choices() != null && !response.choices().isEmpty() 
                    && response.choices().getFirst().message() != null) {
                String content = response.choices().getFirst().message().content();
                if (content != null && !content.isBlank()) {
                    return content.trim();
                }
            }

        } catch (Exception e) {
            System.err.println("Lỗi kết nối API OpenRouter ở bước sinh câu trả lời: " + e.getMessage());
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
                                         List<AiMessageDto> history,
                                         Consumer<SseChunk> onChunk) {
        StopWatch sw = new StopWatch("RAG Adaptive Streaming Profiler");

        // ─── BƯỚC 1: ADAPTIVE ROUTING ───
        sw.start("1. Adaptive Routing");
        onChunk.accept(SseChunk.thinking("⚡ Đang định tuyến câu hỏi bằng AI... "));
        RoutingResultDto route = queryRouter.routeQuery(userMessage);
        sw.stop();

        boolean isDeepPath = "DEEP".equalsIgnoreCase(route.routingPath());
        onChunk.accept(SseChunk.thinking("Định tuyến: " + (isDeepPath ? "DEEP_PATH 🔍" : "FAST_PATH ⚡") + "\n"));

        List<SemanticBookSearchDTO> finalBooks = List.of();

        // Định tuyến an toàn tuyệt đối (Fail-safe): Kiểm tra intent của router hoặc dùng rule detector bổ trợ
        String intentStr = route.intent() != null ? route.intent().toUpperCase() : "";
        boolean isBookSearch = intentStr.contains("TIM_SACH") 
                            || intentStr.contains("BOOK_SEARCH") 
                            || intentStr.contains("SACH") 
                            || intentStr.contains("BOOK")
                            || ruleDetector.detect(userMessage).filter(i -> i == Intent.BOOK_SEARCH).isPresent();

        if (isBookSearch) {
            // Lấy từ khóa chính thức từ router, fallback làm sạch từ khóa nếu trống
            String searchKeyword;
            if (route.extractedKeywords() != null && !route.extractedKeywords().isEmpty()) {
                searchKeyword = String.join(" ", route.extractedKeywords());
            } else {
                searchKeyword = safeKeyword(null, userMessage);
            }

            // ─── BƯỚC 2: RETRIEVAL (Lấy Top 30 sách) ───
            onChunk.accept(SseChunk.thinking("📖 Đang tìm kiếm các sách liên quan trong kho...\n"));
            sw.start("2. Database Retrieval");
            List<SemanticBookSearchDTO> rawCandidates;
            try {
                float[] queryEmbedding = bookSearchService.generateQueryEmbedding(searchKeyword);
                // Truy vấn Top 30 cuốn sách ứng viên để đưa vào xếp hạng
                rawCandidates = bookSearchService.searchByVector(
                    bookSearchService.toVectorLiteral(queryEmbedding),
                    searchKeyword, 30, 0, null, null, null
                );
            } catch (Exception e) {
                rawCandidates = bookSearchService.searchByText(searchKeyword, 30, 0, null, null, null);
            }
            sw.stop();

            // ─── BƯỚC 3: MULTI-STAGE RE-RANKING ───
            if (!rawCandidates.isEmpty()) {
                if (!isDeepPath) {
                    // FAST_PATH: Chạy Cross-Encoder lấy Top 5
                    sw.start("3a. Fast Cross-Encoder Reranking");
                    onChunk.accept(SseChunk.thinking("✨ Đang xếp hạng nhanh bằng Cross-Encoder...\n"));
                    finalBooks = crossReranker.rerank(searchKeyword, rawCandidates, 5);
                    sw.stop();
                } else {
                    // DEEP_PATH: Cross-Encoder (Top 10) + LLM-as-a-Judge (Top 3)
                    sw.start("3b. Deep Multi-stage Reranking");
                    onChunk.accept(SseChunk.thinking("✨ Đang xếp hạng sơ bộ bằng Cross-Encoder...\n"));
                    List<SemanticBookSearchDTO> top10 = crossReranker.rerank(searchKeyword, rawCandidates, 10);
                    
                    onChunk.accept(SseChunk.thinking("🤖 Trọng tài AI đang đối chiếu logic sâu các ứng cử viên...\n"));
                    finalBooks = judgeService.evaluateAndFilter(userMessage, top10);
                    sw.stop();
                }
            }

            // Gửi dữ liệu Card sách qua UI (Prefix: 8:)
            if (!finalBooks.isEmpty()) {
                try {
                    List<Map<String, Object>> bookCards = finalBooks.stream()
                        .map(this::toBookCard)
                        .toList();
                    String jsonCards = objectMapper.writeValueAsString(bookCards);
                    onChunk.accept(SseChunk.bookCards(jsonCards));
                } catch (Exception ignored) {}
            }
        }

        // ─── BƯỚC 4: STREAMING CHAT (Prefix: 0:) ───
        sw.start("4. Streaming Chat response");
        String textContext = buildBookContext(finalBooks);
        String finalSystemPrompt = buildRagPrompt(
            new IntentResponseDto(route.intent(), (route.extractedKeywords() != null ? String.join(", ", route.extractedKeywords()) : null), null), 
            textContext
        );
        streamChatResponse(finalSystemPrompt, userMessage, history, onChunk);
        sw.stop();

        // ─── BƯỚC 5: END OF STREAM (Prefix: e:) ───
        onChunk.accept(SseChunk.endStream("{\"finishReason\":\"stop\",\"tookSeconds\":" + sw.getTotalTimeSeconds() + "}"));
        System.out.println("\n" + sw.prettyPrint());
    }

    private void streamChatResponse(String systemPrompt,
                                     String userMessage,
                                     List<AiMessageDto> history,
                                     Consumer<SseChunk> onChunk) {
        String model = properties.getChatModel() == null || properties.getChatModel().isBlank()
            ? "google/gemini-2.5-flash" : properties.getChatModel().trim();

        List<AiMessageDto> messages = new ArrayList<>();
        messages.add(new AiMessageDto("system", systemPrompt));
        if (history != null) {
            messages.addAll(history);
        }
        messages.add(new AiMessageDto("user", userMessage));

        var requestBody = Map.of(
            "model", model,
            "messages", messages,
            "stream", true
        );

        try {
            restClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .exchange((clientRequest, clientResponse) -> {
                    try (var reader = new BufferedReader(
                            new InputStreamReader(clientResponse.getBody(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (line.isBlank()) continue;
                            String trimmedLine = line.trim();
                            if (trimmedLine.startsWith("data:")) {
                                String payload = trimmedLine.substring(5).trim();
                                if ("[DONE]".equals(payload)) {
                                    break;
                                }
                                try {
                                    OpenRouterStreamChunk chunk = objectMapper.readValue(payload, OpenRouterStreamChunk.class);
                                    if (chunk.choices() != null && !chunk.choices().isEmpty() && chunk.choices().getFirst().delta() != null) {
                                        String token = chunk.choices().getFirst().delta().content();
                                        if (token != null && !token.isEmpty()) {
                                            onChunk.accept(SseChunk.text(token));
                                        }
                                    }
                                } catch (Exception parseErr) {
                                    // Skip malformed line
                                }
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
