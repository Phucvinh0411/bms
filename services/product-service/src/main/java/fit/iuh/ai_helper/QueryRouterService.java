package fit.iuh.ai_helper;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import fit.iuh.config.OpenRouterAIProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;

@Service
public class QueryRouterService {

    private final RestClient restClient;
    private final OpenRouterAIProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public QueryRouterService(@Qualifier("cpuRestClient") RestClient restClient,
                              OpenRouterAIProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public RoutingResultDto routeQuery(String userMessage) {
        String systemPrompt = """
            Bạn là "Bộ định tuyến truy vấn" (Query Router) của một hệ thống bán sách. 
            Nhiệm vụ của bạn là đọc câu hỏi của khách hàng và quyết định xem câu hỏi đó cần xử lý Nhanh (FAST) hay Sâu (DEEP).

            [PHÂN LOẠI MỨC ĐỘ]
            - FAST (Xử lý Nhanh): Câu hỏi khám phá chung chung, tìm kiếm theo chủ đề rộng, tìm tác giả, hoặc câu hỏi có tối đa 1 điều kiện cơ bản.
              Ví dụ: "Tôi muốn tìm sách về lịch sử", "Có sách nào của Nguyễn Nhật Ánh không?", "Cho mình xin vài cuốn tiểu thuyết hay."
            - DEEP (Xử lý Sâu): Câu hỏi chứa nhiều điều kiện ràng buộc logic phức tạp, yếu tố phủ định, so sánh giá cả, hoặc hướng tới một đối tượng quá đặc thù.
              Ví dụ: "Tìm sách cho trẻ em 10 tuổi nhưng giá dưới 100k", "Sách về lập trình nhưng đừng quá khô khan, phù hợp người mới", "Mua sách tặng sếp nữ thích khoa học viễn tưởng".

            [YÊU CẦU ĐẦU RA]
            Bạn KHÔNG ĐƯỢC PHÉP trò chuyện, giải thích. Chỉ trả về một JSON Object duy nhất với định dạng sau:
            {
              "routing_path": "FAST" hoặc "DEEP",
              "intent": "Mục đích chính của user (ví dụ: TIM_SACH, HOI_DON_HANG, GENERAL_CHAT)",
              "extracted_keywords": ["từ khóa 1", "từ khóa 2"],
              "reason": "Giải thích trong 1 câu tại sao bạn chọn FAST hoặc DEEP"
            }
            """;

        String model = properties.getIntentModel() != null && !properties.getIntentModel().isBlank()
            ? properties.getIntentModel().trim()
            : "google/gemini-2.5-flash";

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
                return RoutingResultDto.fastFallback("Không nhận được phản hồi từ OpenRouter");
            }

            String content = response.choices().getFirst().message().content();
            String jsonPayload = extractJson(content);
            return objectMapper.readValue(jsonPayload, RoutingResultDto.class);

        } catch (Exception e) {
            System.err.println("Lỗi phân loại Routing, tự động hạ cấp về FAST: " + e.getMessage());
            return RoutingResultDto.fastFallback("Hệ thống lỗi, tự động hạ cấp: " + e.getMessage());
        }
    }

    private String extractJson(String content) {
        String trimmed = content.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }
}
