package fit.iuh.modules.cart.repository;

import fit.iuh.modules.cart.model.RedisCart;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.concurrent.TimeUnit;

@Repository
@RequiredArgsConstructor
public class CartRedisRepository {
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String KEY_PREFIX = "bms:cart:";
    private static final long TTL_DAYS = 30;

    private String buildKey(Long userId) {
        return KEY_PREFIX + userId;
    }

    public RedisCart getCart(Long userId) {
        String key = buildKey(userId);
        RedisCart cart = (RedisCart) redisTemplate.opsForValue().get(key);
        if (cart == null) {
            cart = RedisCart.builder()
                    .userId(userId)
                    .items(new ArrayList<>())
                    .build();
        }
        return cart;
    }

    public void saveCart(RedisCart cart) {
        if (cart == null || cart.getUserId() == null) {
            return;
        }
        String key = buildKey(cart.getUserId());
        redisTemplate.opsForValue().set(key, cart, TTL_DAYS, TimeUnit.DAYS);
    }

    public void deleteCart(Long userId) {
        String key = buildKey(userId);
        redisTemplate.delete(key);
    }
}
