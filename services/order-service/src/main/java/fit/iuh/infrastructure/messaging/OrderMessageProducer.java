package fit.iuh.infrastructure.messaging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Producer gửi tin nhắn qua RabbitMQ.
 */
@Component
@Slf4j
public class OrderMessageProducer {

    private final RabbitTemplate rabbitTemplate;

    public OrderMessageProducer(@Autowired(required = false) RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void sendOrderCompletedEvent(Long orderId) {
        log.info("Publishing order completed event for Order ID: {}", orderId);
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend("order-completed-exchange", "order.completed", orderId);
            } catch (Exception e) {
                log.error("Không gửi được event hoàn tất đơn hàng qua RabbitMQ: {}", e.getMessage(), e);
            }
        }
    }

    public void publishPaymentSettledEvent(Long orderId, String status) {
        log.info("Publishing PaymentSettledEvent for Order ID: {} with status: {}", orderId, status);
        if (rabbitTemplate != null) {
            try {
                PaymentSettledEvent event = new PaymentSettledEvent(orderId, status);
                rabbitTemplate.convertAndSend("payment-settled-exchange", "payment.settled", event);
            } catch (Exception e) {
                log.error("Không gửi được PaymentSettledEvent qua RabbitMQ: {}", e.getMessage(), e);
            }
        }
    }

    public void enqueueOrderTimeoutCheck(Long orderId) {
        log.info("Enqueuing order timeout check for Order ID: {} with 15 minutes TTL", orderId);
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(fit.iuh.infrastructure.config.OrderTimeoutQueueConfig.TTL_QUEUE_NAME, orderId);
            } catch (Exception e) {
                log.error("Không xếp hàng được timeout check cho đơn hàng #{} qua RabbitMQ: {}", orderId, e.getMessage(), e);
            }
        }
    }
}
