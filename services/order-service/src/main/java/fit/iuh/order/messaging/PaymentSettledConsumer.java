package fit.iuh.order.messaging;

import fit.iuh.order.order.core.model.Order;
import fit.iuh.order.order.core.model.OrderStatus;
import fit.iuh.order.order.core.model.PaymentStatus;
import fit.iuh.order.payment.model.PaymentTransaction;
import fit.iuh.order.order.core.repository.OrderRepository;
import fit.iuh.order.payment.repository.PaymentTransactionRepository;
import fit.iuh.order.order.core.state.PendingState;
import fit.iuh.order.payment.controller.PaymentController;
import fit.iuh.order.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Consumer/Listener lắng nghe các sự kiện thanh toán từ RabbitMQ
 * Thực hiện xử lý bất đồng bộ nghiệp vụ thanh toán thành công:
 * 1. Chuyển đổi trạng thái đơn hàng qua State Pattern (PENDING -> CONFIRMED).
 * 2. Ghi nhận giao dịch thanh toán thành công (PAID).
 * 3. Kích hoạt Server-Sent Events (SSE) đẩy tín hiệu tức thời xuống trình duyệt khách hàng.
 */
@Component
public class PaymentSettledConsumer {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private PaymentController paymentController;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void consumePaymentSettledEvent(PaymentSettledEvent event) {
        System.out.println("RabbitMQ Consumer: Tiếp nhận PaymentSettledEvent -> " + event);
        
        Long orderId = event.getOrderId();
        String status = event.getStatus();
        
        if (!"PAID".equalsIgnoreCase(status)) {
            System.out.println("RabbitMQ Consumer: Bỏ qua sự kiện do trạng thái không phải PAID.");
            return;
        }

        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order != null) {
                System.out.println("RabbitMQ Consumer: Đang tiến hành cập nhật bất đồng bộ cho đơn hàng #" + orderId);
                
                // 1. Chuyển trạng thái đơn hàng từ AWAITING_PAYMENT sang PENDING (Chờ xử lý) sau khi thanh toán thành công
                if (order.getStatus() == OrderStatus.AWAITING_PAYMENT || order.getStatus() == OrderStatus.PENDING) {
                    order.setStatus(OrderStatus.PENDING);
                    orderRepository.save(order);
                    System.out.println("RabbitMQ Consumer: Đã chuyển đơn hàng #" + orderId + " sang trạng thái PENDING (Chờ xử lý).");
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
                System.out.println("RabbitMQ Consumer: Đã cập nhật trạng thái giao dịch thành công (PAID).");
                
                // 3. Đẩy thông báo SSE thời gian thực trực tiếp xuống Next.js Client
                paymentController.sendSseNotification(orderId, "PAID");
                System.out.println("RabbitMQ Consumer: Đã kích hoạt đẩy thông báo thời gian thực qua SSE.");
            } else {
                System.err.println("RabbitMQ Consumer: LỖI - Không tìm thấy đơn hàng ID: " + orderId);
            }
        } catch (Exception e) {
            System.err.println("RabbitMQ Consumer: Gặp lỗi nghiêm trọng khi xử lý sự kiện: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
