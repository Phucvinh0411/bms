package fit.iuh.order.module.messaging;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Producer gửi tin nhắn qua RabbitMQ
 * Sử dụng @Autowired(required = false) để tránh lỗi khởi động ứng dụng nếu RabbitMQ chưa được bật ở local.
 */
@Component
public class OrderMessageProducer {

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void sendOrderCompletedEvent(Long orderId) {
        System.out.println("Publishing order completed event for Order ID: " + orderId);
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend("order-completed-exchange", "order.completed", orderId);
            } catch (Exception e) {
                System.err.println("Không gửi được event hoàn tất đơn hàng qua RabbitMQ: " + e.getMessage());
            }
        }
    }

    public void publishPaymentSettledEvent(Long orderId, String status) {
        System.out.println("Publishing PaymentSettledEvent for Order ID: " + orderId + " with status: " + status);
        if (rabbitTemplate != null) {
            try {
                PaymentSettledEvent event = new PaymentSettledEvent(orderId, status);
                rabbitTemplate.convertAndSend("payment-settled-exchange", "payment.settled", event);
            } catch (Exception e) {
                System.err.println("Không gửi được PaymentSettledEvent qua RabbitMQ: " + e.getMessage());
            }
        }
    }
}
