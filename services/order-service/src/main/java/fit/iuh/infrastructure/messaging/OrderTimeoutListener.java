package fit.iuh.infrastructure.messaging;

import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderStatus;
import fit.iuh.modules.order.repository.OrderRepository;
import fit.iuh.modules.order.service.OrderService;
import fit.iuh.infrastructure.config.OrderTimeoutQueueConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderTimeoutListener {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @RabbitListener(queues = OrderTimeoutQueueConfig.DLX_QUEUE_NAME)
    public void handleOrderTimeout(Long orderId) {
        log.info("RabbitMQ Consumer: Received timeout message from DLQ for Order ID: {}", orderId);
        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                log.warn("Order #{} not found. Skipping timeout cancellation.", orderId);
                return;
            }

            // Chỉ tự động hủy nếu đơn hàng vẫn đang ở trạng thái AWAITING_PAYMENT hoặc PENDING
            if (order.getStatus() == OrderStatus.AWAITING_PAYMENT || order.getStatus() == OrderStatus.PENDING) {
                log.info("Order #{} is still unpaid in state: {}. Cancelling order via state pattern.", orderId, order.getStatus());
                orderService.cancelOrder(orderId);
            } else {
                log.info("Order #{} is in state: {}. Skipping auto-cancellation.", orderId, order.getStatus());
            }
        } catch (Exception e) {
            log.error("Failed to process timeout auto-cancellation for Order #{}: {}", orderId, e.getMessage(), e);
        }
    }
}
