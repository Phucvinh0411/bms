package fit.iuh.infrastructure.ratelimit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
public class CartRateLimiter {
    private static final int LIMIT = 60; // 60 requests
    private static final int WINDOW_SECONDS = 60; // per 1 minute (60 seconds)

    private final StringRedisTemplate redisTemplate;

    public CartRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Tích hợp cơ chế giới hạn tần suất yêu cầu (Rate Limiting) theo thuật toán Sliding Window log sử dụng Redis ZSET.
     * Cơ chế này chạy phân tán, đảm bảo hoạt động đồng bộ trên toàn bộ cụm máy chủ dịch vụ.
     */
    public RateLimitDecision tryConsume(Long userId) {
        if (userId == null) {
            return new RateLimitDecision(true, 0);
        }

        String key = "ratelimit:cart:" + userId;
        long now = Instant.now().toEpochMilli();
        long clearBefore = now - (WINDOW_SECONDS * 1000L);

        try {
            // 1. Xóa các request cũ nằm ngoài khung thời gian Sliding Window
            redisTemplate.opsForZSet().removeRangeByScore(key, 0, clearBefore);

            // 2. Đếm số lượng request hiện tại trong window
            Long count = redisTemplate.opsForZSet().zCard(key);
            if (count != null && count >= LIMIT) {
                // Tính toán khoảng thời gian cần chờ đến khi request cũ nhất hết hạn
                var oldestSet = redisTemplate.opsForZSet().rangeWithScores(key, 0, 0);
                long oldestTimestamp = now;
                if (oldestSet != null && !oldestSet.isEmpty()) {
                    var oldest = oldestSet.iterator().next();
                    if (oldest.getScore() != null) {
                        oldestTimestamp = oldest.getScore().longValue();
                    }
                }
                long timePassed = now - oldestTimestamp;
                long retryAfter = Math.max(1, WINDOW_SECONDS - (timePassed / 1000));
                return new RateLimitDecision(false, retryAfter);
            }

            // 3. Ghi nhận request mới vào ZSET
            String requestId = UUID.randomUUID().toString();
            redisTemplate.opsForZSet().add(key, requestId, now);
            
            // 4. Reset TTL của key để giải phóng bộ nhớ tự động
            redisTemplate.expire(key, java.time.Duration.ofSeconds(WINDOW_SECONDS + 5));

            return new RateLimitDecision(true, 0);
        } catch (Exception e) {
            // Thiết kế Fail-Open: Nếu Redis gặp lỗi, hệ thống vẫn tiếp tục cho phép xử lý để tránh gián đoạn dịch vụ
            return new RateLimitDecision(true, 0);
        }
    }

    public void clear() {
        // Hệ thống tự động dọn dẹp nhờ TTL trong Redis, không cần can thiệp thủ công
    }
}