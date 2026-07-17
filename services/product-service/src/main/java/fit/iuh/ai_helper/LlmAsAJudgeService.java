package fit.iuh.ai_helper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import fit.iuh.config.OpenRouterAIProperties;
import fit.iuh.semanticsearch.SemanticBookSearchDTO;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LlmAsAJudgeService {

    private final RestClient restClient;
    private final OpenRouterAIProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public LlmAsAJudgeService(@Qualifier("chatRestClient") RestClient restClient,
                              OpenRouterAIProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public List<SemanticBookSearchDTO> evaluateAndFilter(String userQuery,
                                                         List<SemanticBookSearchDTO> top10Candidates) {
        if (top10Candidates == null || top10Candidates.isEmpty()) {
            return List.of();
        }

        String systemPrompt = """
            Bạn là một "Thẩm phán AI" (LLM-as-a-Judge) độc lập, chuyên nghiệp cho hệ thống nhà sách.
            Nhiệm vụ của bạn là đánh giá kỹ lưỡng danh sách 10 cuốn sách ứng cử viên dưới đây dựa trên yêu cầu phức tạp của khách hàng và chọn ra đúng 3 cuốn sách phù hợp nhất về mặt LOGIC.

            [QUY TẮC ĐÁNH GIÁ CHẶT CHẼ]
            1. Kiểm tra kỹ các điều kiện giới hạn logic trong câu hỏi (Ví dụ: giá cả dưới bao nhiêu, độ tuổi phù hợp, sách dành cho ai).
            2. Chú ý các điều kiện PHỦ ĐỊNH (Ví dụ: "nhưng đừng quá khô khan", "không phải sách dịch", "không nói về lý thuyết suông").
            3. Chú ý các đối tượng đặc thù (Ví dụ: "sếp nữ thích khoa học viễn tưởng", "tặng người mới học lập trình").
            4. Chỉ chấm điểm và đánh giá trên danh sách 10 sách được cung cấp. KHÔNG được tự bịa ra sách mới.

            [YÊU CẦU ĐẦU RA]
            Bạn KHÔNG ĐƯỢC PHÉP nói chuyện hay giải thích thêm. Chỉ trả về một JSON Array duy nhất chứa tối đa 3 Object theo cấu trúc sau:
            [
              {
                "id": [ID của cuốn sách được chọn, kiểu số nguyên],
                "reason": "[Giải thích trong 1 câu tại sao cuốn này hoàn hảo với logic yêu cầu phức tạp của khách]"
              }
            ]
            """;

        // Tạo chuỗi mô tả 10 cuốn sách
        StringBuilder candidatesText = new StringBuilder();
        for (SemanticBookSearchDTO book : top10Candidates) {
            candidatesText.append("- ID: ").append(book.id())
                .append(" | Tên: ").append(book.title())
                .append(" | Giá: ").append(book.price() != null ? book.price().longValue() : 0).append(" VNĐ")
                .append(" | Mô tả: ").append(book.description())
                .append("\n");
        }

        String userPrompt = "Yêu cầu của khách hàng: \"" + userQuery + "\"\n\nDanh sách 10 sách ứng viên:\n" + candidatesText;

        String model = properties.getChatModel() != null && !properties.getChatModel().isBlank()
            ? properties.getChatModel().trim() 
            : "google/gemini-2.5-flash";

        var requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            ),
            "temperature", 0.0,
            "max_tokens", 300
        );

        try {
            var response = restClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(OpenRouterChatResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty() 
                    || response.choices().getFirst().message() == null || response.choices().getFirst().message().content() == null) {
                return top10Candidates.stream().limit(3).toList();
            }

            String content = response.choices().getFirst().message().content();
            String jsonPayload = extractJsonArray(content);

            List<JudgeDecision> decisions = objectMapper.readValue(jsonPayload, new TypeReference<List<JudgeDecision>>() {});
            
            // Map kết quả lọc từ Judge ID về lại list SemanticBookSearchDTO
            List<Long> selectedIds = decisions.stream()
                .map(JudgeDecision::id)
                .toList();
            
            return top10Candidates.stream()
                .filter(book -> selectedIds.contains(book.id()))
                .limit(3)
                .collect(Collectors.toList());

        } catch (Exception e) {
            System.err.println("Lỗi trong quá trình LLM-as-a-Judge đánh giá: " + e.getMessage() + ". Hạ cấp lấy Top 3 từ Cross-Encoder.");
            return top10Candidates.stream().limit(3).toList();
        }
    }

    private String extractJsonArray(String content) {
        String trimmed = content.trim();
        int start = trimmed.indexOf('[');
        int end = trimmed.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private record JudgeDecision(Long id, String reason) {}
}
