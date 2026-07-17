package fit.iuh.infrastructure.ratelimit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fit.iuh.modules.order.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.Map;

@Component
public class CartRateLimitInterceptor implements HandlerInterceptor {
    private static final String TOO_MANY_REQUESTS_MESSAGE = "Bạn thao tác quá nhanh, vui lòng đợi một lát.";

    private final CartRateLimiter cartRateLimiter;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CartRateLimitInterceptor(CartRateLimiter cartRateLimiter) {
        this.cartRateLimiter = cartRateLimiter;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Long userId = resolveUserId(request);
        RateLimitDecision decision = cartRateLimiter.tryConsume(userId);
        if (decision.allowed()) {
            return true;
        }

        writeTooManyRequests(response, decision.retryAfterSeconds());
        return false;
    }

    private Long resolveUserId(HttpServletRequest request) {
        if ("GET".equalsIgnoreCase(request.getMethod())) {
            Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            if (variables instanceof Map<?, ?> pathVariables) {
                Object userId = pathVariables.get("userId");
                if (userId != null) {
                    return parseUserId(userId.toString());
                }
            }
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(request.getInputStream());
            if (root == null || !root.hasNonNull("userId")) {
                return null;
            }
            return root.get("userId").asLong();
        } catch (IOException ignored) {
            return null;
        }
    }

    private Long parseUserId(String rawUserId) {
        try {
            return Long.parseLong(rawUserId);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void writeTooManyRequests(HttpServletResponse response, long retryAfterSeconds) throws IOException {
        response.setStatus(429);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        objectMapper.writeValue(response.getWriter(), new ApiResponse<>(TOO_MANY_REQUESTS_MESSAGE, null));
    }
}