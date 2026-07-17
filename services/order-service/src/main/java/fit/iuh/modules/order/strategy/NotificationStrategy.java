package fit.iuh.modules.order.strategy;

public interface NotificationStrategy {
    void send(Long userId, String content);
}
