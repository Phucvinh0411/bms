package fit.iuh.ai_helper;

import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:3001"})
@AllArgsConstructor
public class AiChatController {

    private final AgentRouterService agentRouterService;
    private final ConversationMemoryService memoryService;

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

    @PostMapping(value = "/api/v1/ai/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@RequestBody AiStreamRequestDto request) {
        // Timeout 3 phút cho LLM inference
        SseEmitter emitter = new SseEmitter(180_000L);

        String userMessage = request.getUserMessage();
        String sessionId = request.getSessionId();

        if (userMessage == null || userMessage.isBlank()) {
            sendErrorAndComplete(emitter, "userMessage không được để trống");
            return emitter;
        }
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        final String finalSessionId = sessionId;

        // Chạy async trên virtual thread (Java 21)
        Thread.startVirtualThread(() -> {
            try {
                // 1. Lấy conversation history từ Redis
                List<AiMessageDto> history = memoryService.getHistory(finalSessionId);

                // 2. Gửi sessionId về client sử dụng prefix '2:'
                emitter.send(SseEmitter.event()
                    .data(SseChunk.session(finalSessionId).payload()));

                // 3. Thực hiện RAG Streaming Pipeline
                StringBuilder fullResponse = new StringBuilder();
                agentRouterService.routeAndExecuteStreaming(
                    userMessage.trim(),
                    history,
                    (SseChunk chunk) -> {
                        try {
                            // Viết trực tiếp chunk thô đã chứa prefix (0:, 8:, e:) về client
                            emitter.send(SseEmitter.event()
                                .data(chunk.payload()));
                            
                            // Trích xuất text (prefix '0:') lưu vào lịch sử chat
                            if (chunk.payload().startsWith("0:")) {
                                String cleanToken = chunk.payload().substring(2);
                                fullResponse.append(cleanToken);
                            }
                        } catch (IOException e) {
                            throw new UncheckedIOException(e);
                        }
                    }
                );

                // 4. Lưu hội thoại vào Redis
                memoryService.append(finalSessionId, userMessage.trim(), fullResponse.toString());
                emitter.complete();

            } catch (Exception e) {
                sendErrorAndComplete(emitter, "Lỗi hệ thống: " + e.getMessage());
            }
        });

        emitter.onTimeout(emitter::complete);
        emitter.onError(t -> emitter.complete());

        return emitter;
    }

    private void sendErrorAndComplete(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().data(SseChunk.error(message).payload()));
            emitter.complete();
        } catch (IOException ignored) {}
    }
}
