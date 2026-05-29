package fit.iuh.ai_helper;

import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:3001"})
@AllArgsConstructor
public class AiChatController {

    private final AgentRouterService agentRouterService;

    @PostMapping({"/chat", "/ai/chat", "/api/v1/chat", "/api/v1/ai/chat"})
    public ResponseEntity<Map<String, String>> chat(@RequestBody AiChatRequestDto request) {
        Map<String, String> response = new HashMap<>();

        try {
            String userMessage = request == null ? null : request.getUserMessage();
            if (userMessage == null || userMessage.isBlank()) {
                response.put("error", "userMessage không được để trống");
                return ResponseEntity.badRequest().body(response);
            }

            String answer = agentRouterService.routeAndExecute(userMessage.trim());
            response.put("message", answer);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Lỗi xử lý chat: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

