package fit.iuh.infrastructure.messaging;

import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderStatus;
import fit.iuh.domain.model.PaymentStatus;
import fit.iuh.modules.payment.model.PaymentTransaction;
import fit.iuh.modules.order.repository.OrderRepository;
import fit.iuh.modules.payment.repository.PaymentTransactionRepository;
import fit.iuh.modules.payment.controller.PaymentController;
import fit.iuh.infrastructure.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumer/Listener lắng nghe các sự kiện thanh toán từ RabbitMQ
 * Thực hiện xử lý bất đồng bộ nghiệp vụ thanh toán thành công:
 * 1. Chuyển đổi trạng thái đơn hàng (PENDING -> CONFIRMED).
 * 2. Ghi nhận giao dịch thanh toán thành công (PAID).
 * 3. Kích hoạt Server-Sent Events (SSE) đẩy tín hiệu tức thời xuống trình duyệt khách hàng.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentSettledConsumer {

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentController paymentController;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void consumePaymentSettledEvent(PaymentSettledEvent event) {
        log.info("RabbitMQ Consumer: Tiếp nhận PaymentSettledEvent -> {}", event);
        
        Long orderId = event.getOrderId();
        String status = event.getStatus();
        
        if (!"PAID".equalsIgnoreCase(status)) {
            log.info("RabbitMQ Consumer: Bỏ qua sự kiện do trạng thái không phải PAID.");
            return;
        }

        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order != null) {
                log.info("RabbitMQ Consumer: Đang tiến hành cập nhật bất đồng bộ cho đơn hàng #{}", orderId);
                
                // 1. Chuyển trạng thái đơn hàng từ AWAITING_PAYMENT sang PENDING (Chờ xử lý) sau khi thanh toán thành công
                if (order.getStatus() == OrderStatus.AWAITING_PAYMENT || order.getStatus() == OrderStatus.PENDING) {
                    order.setStatus(OrderStatus.PENDING);
                    orderRepository.save(order);
                    log.info("RabbitMQ Consumer: Đã chuyển đơn hàng #{} sang trạng thái PENDING (Chờ xử lý).", orderId);
                }

                // 2. Cập nhật Payment Transaction sang trạng thái PAID
                PaymentTransaction transaction = paymentTransactionRepository.findByIdAndIsDeletedFalse(orderId).orElse(null);
                if (transaction != null) {
                    transaction.setStatus(PaymentStatus.PAID);
                    paymentTransactionRepository.save(transaction);
                } else {
                    PaymentTransaction newTx = new PaymentTransaction();
                    newTx.setId(orderId);
                    newTx.setOrderId(orderId);
                    newTx.setAmount(order.getFinalTotal());
                    newTx.setStatus(PaymentStatus.PAID);
                    newTx.setIsDeleted(false);
                    paymentTransactionRepository.save(newTx);
                }
                log.info("RabbitMQ Consumer: Đã cập nhật trạng thái giao dịch thành công (PAID).");
                
                // 3. Đẩy thông báo SSE thời gian thực trực tiếp xuống Next.js Client
                paymentController.sendSseNotification(orderId, "PAID");
                log.info("RabbitMQ Consumer: Đã kích hoạt đẩy thông báo thời gian thực qua SSE.");
            } else {
                log.error("RabbitMQ Consumer: LỖI - Không tìm thấy đơn hàng ID: {}", orderId);
            }
        } catch (Exception e) {
            log.error("RabbitMQ Consumer: Gặp lỗi nghiêm trọng khi xử lý sự kiện: {}", e.getMessage(), e);
        }
    }
}
