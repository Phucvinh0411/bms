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

        Thread.startVirtualThread(() -> {
            try {
                List<OllamaMessageDto> history = memoryService.getHistory(finalSessionId);

                emitter.send(SseEmitter.event()
                    .name("session")
                    .data(Map.of("sessionId", finalSessionId)));

                StringBuilder fullResponse = new StringBuilder();
                agentRouterService.routeAndExecuteStreaming(
                    userMessage.trim(),
                    history,
                    (SseChunk chunk) -> {
                        try {
                            emitter.send(SseEmitter.event()
                                .name(chunk.type())
                                .data(chunk.payload()));
                            if ("text".equals(chunk.type())) {
                                fullResponse.append(chunk.payload());
                            }
                        } catch (IOException e) {
                            throw new UncheckedIOException(e);
                        }
                    }
                );

                memoryService.append(finalSessionId, userMessage.trim(), fullResponse.toString());

                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();

            } catch (Exception e) {
                sendErrorAndComplete(emitter, "Lỗi xử lý: " + e.getMessage());
            }
        });

        emitter.onTimeout(emitter::complete);
        emitter.onError(t -> emitter.complete());

        return emitter;
    }

    private void sendErrorAndComplete(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().name("error").data(Map.of("error", message)));
            emitter.complete();
        } catch (IOException ignored) {}
    }
}

