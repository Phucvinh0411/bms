package fit.iuh.ai_helper;

import fit.iuh.config.OllamaAIProperties;
import fit.iuh.semanticsearch.HybridSearchService;
import fit.iuh.semanticsearch.SemanticBookSearchDTO;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StopWatch;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class AgentRouterService {

    private final RuleIntentDetector ruleDetector;
    private final LlmIntentAnalyzer llmAnalyzer;
    private final HybridSearchService bookSearchService; // "Tool" cứng để lục lọi DB sách
    private final RestClient restClient;
    private final OllamaAIProperties properties;

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
}
