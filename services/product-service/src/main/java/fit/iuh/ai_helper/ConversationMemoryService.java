package fit.iuh.ai_helper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ConversationMemoryService {

    private static final String KEY_PREFIX = "chat:session:";
    private static final int MAX_HISTORY = 10;           // Giữ tối đa 10 messages
    private static final long TTL_HOURS = 2;             // Hết hạn sau 2 giờ idle

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ConversationMemoryService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Lấy lịch sử hội thoại dưới dạng List<AiMessageDto>
     */
    public List<AiMessageDto> getHistory(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        List<String> raw = redisTemplate.opsForList().range(key, 0, -1);
        if (raw == null || raw.isEmpty()) return List.of();

        return raw.stream()
            .map(str -> {
                try {
                    return objectMapper.readValue(str, AiMessageDto.class);
                } catch (JsonProcessingException e) {
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    /**
     * Append user message + assistant response vào history
     * Trim nếu vượt MAX_HISTORY (FIFO)
     */
    public void append(String sessionId, String userMessage, String assistantResponse) {
        String key = KEY_PREFIX + sessionId;
        try {
            String userJson = objectMapper.writeValueAsString(new AiMessageDto("user", userMessage));
            String assistantJson = objectMapper.writeValueAsString(new AiMessageDto("assistant", assistantResponse));

            redisTemplate.opsForList().rightPush(key, userJson);
            redisTemplate.opsForList().rightPush(key, assistantJson);

            // Trim: giữ MAX_HISTORY messages gần nhất (mỗi turn = 2 messages)
            Long size = redisTemplate.opsForList().size(key);
            if (size != null && size > MAX_HISTORY * 2) {
                redisTemplate.opsForList().trim(key, size - (MAX_HISTORY * 2), -1);
            }

            // Reset TTL
            redisTemplate.expire(key, Duration.ofHours(TTL_HOURS));
        } catch (JsonProcessingException e) {
            // Ignore error
        }
    }

    public void clearSession(String sessionId) {
        redisTemplate.delete(KEY_PREFIX + sessionId);
    }
}
