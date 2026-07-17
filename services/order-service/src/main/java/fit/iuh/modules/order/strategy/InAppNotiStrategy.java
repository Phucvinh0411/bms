package fit.iuh.modules.order.strategy;

import org.springframework.stereotype.Component;

@Component
public class InAppNotiStrategy implements NotificationStrategy {
    @Override
    public void send(Long userId, String content) {
        // Placeholder for in-app notification integration.
    }
}
