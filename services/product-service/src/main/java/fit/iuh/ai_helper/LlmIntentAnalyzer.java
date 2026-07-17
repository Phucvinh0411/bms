package fit.iuh.ai_helper;

import fit.iuh.config.OpenRouterAIProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@Component
public class LlmIntentAnalyzer {

    private final RestClient restClient;
    private final OpenRouterAIProperties properties;
    private final ObjectMapper objectMapper;

    public LlmIntentAnalyzer(@Qualifier("cpuRestClient") RestClient restClient,
                             OpenRouterAIProperties properties,
                             ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public IntentResponseDto analyzeWithLlm(String userMessage) {
        String systemPrompt = buildSystemPrompt();
        String model = safeText(properties.getIntentModel(), "google/gemini-2.5-flash");

        var requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userMessage)
            ),
            "temperature", 0.0
        );

        try {
            var response = restClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(OpenRouterChatResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty() 
                    || response.choices().getFirst().message() == null || response.choices().getFirst().message().content() == null) {
                return IntentResponseDto.generalChatFallback();
            }

            String content = response.choices().getFirst().message().content();
            String jsonPayload = extractJsonPayload(content);
            if (jsonPayload == null || jsonPayload.isBlank()) {
                return IntentResponseDto.generalChatFallback();
            }

            IntentResponseDto dto = objectMapper.readValue(jsonPayload, IntentResponseDto.class);
            return normalize(dto);
        } catch (Exception e) {
            System.err.println("Lỗi phân tích Intent từ LLM, tự động hạ cấp về GENERAL_CHAT: " + e.getMessage());
            return IntentResponseDto.generalChatFallback();
        }
    }

    private String buildSystemPrompt() {
        return """
            Bạn là một API trích xuất thực thể cho hệ thống nhà sách.

            NHIỆM VỤ BẮT BUỘC:
            - Chỉ phân tích câu của người dùng và trả về DUY NHẤT một JSON thuần túy.
            - JSON phải khớp 100% với cấu trúc:
              {"intent":"BOOK_SEARCH|ORDER_CHECKING|GENERAL_CHAT","keyword":null|string,"maxPrice":null|number}
            - Không được giải thích, không được thêm chữ ngoài JSON.
            - Không được bọc trong dấu nháy khối ```json hoặc bất kỳ markdown nào.
            - Không được trả về mảng, không được trả về nested object.

            QUY TẮC TRÍCH XUẤT:
            - intent: giá trị chuỗi hợp lệ trong BOOK_SEARCH, ORDER_CHECKING, GENERAL_CHAT.
            - keyword: chỉ dùng cho BOOK_SEARCH, phải là từ khóa cốt lõi đã làm sạch, loại bỏ lời chào, lời đệm, câu dài, ký tự thừa.
            - maxPrice: chỉ trích xuất khi người dùng có nhắc đến ngưỡng giá tối đa; quy đổi đơn vị như 200k = 200000, 1.5 triệu = 1500000.
            - Nếu intent không phải BOOK_SEARCH thì keyword phải là null.
            - Nếu không có giá cụ thể thì maxPrice phải là null.

            VÍ DỤ HỢP LỆ:
            - {"intent":"BOOK_SEARCH","keyword":"Java 21","maxPrice":null}
            - {"intent":"BOOK_SEARCH","keyword":"kinh tế vĩ mô","maxPrice":200000}
            - {"intent":"ORDER_CHECKING","keyword":null,"maxPrice":null}
            - {"intent":"GENERAL_CHAT","keyword":null,"maxPrice":null}

            TUYỆT ĐỐI KHÔNG giải thích thêm bất cứ điều gì.
            """;
    }

    private IntentResponseDto normalize(IntentResponseDto dto) {
        if (dto == null) {
            return IntentResponseDto.generalChatFallback();
        }

        String normalizedIntent = safeText(dto.getIntent(), Intent.GENERAL_CHAT.name()).toUpperCase(Locale.ROOT);
        if (!isSupportedIntent(normalizedIntent)) {
            normalizedIntent = Intent.GENERAL_CHAT.name();
        }

        String keyword = dto.getKeyword();
        if (!Intent.BOOK_SEARCH.name().equals(normalizedIntent)) {
            keyword = null;
        } else {
            keyword = sanitizeKeyword(keyword);
        }

        BigDecimal maxPrice = dto.getMaxPrice();
        if (maxPrice != null && maxPrice.signum() < 0) {
            maxPrice = null;
        }

        return new IntentResponseDto(normalizedIntent, keyword, maxPrice);
    }

    private boolean isSupportedIntent(String intent) {
        return Intent.BOOK_SEARCH.name().equals(intent)
            || Intent.ORDER_CHECKING.name().equals(intent)
            || Intent.GENERAL_CHAT.name().equals(intent);
    }

    private String sanitizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String cleaned = keyword.trim()
            .replaceAll("[\\r\\n\\t]+", " ")
            .replaceAll("\\s{2,}", " ")
            .replaceAll("^[\\p{Punct}\\s]+|[\\p{Punct}\\s]+$", "");
        return cleaned.isBlank() ? null : cleaned;
    }

    private String extractJsonPayload(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "");
            trimmed = trimmed.replaceFirst("\\s*```$", "");
        }

        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1).trim();
        }

        return trimmed.isBlank() ? null : trimmed;
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
