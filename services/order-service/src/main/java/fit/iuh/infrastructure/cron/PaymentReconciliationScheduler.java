package fit.iuh.infrastructure.cron;

import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderStatus;
import fit.iuh.domain.model.PaymentStatus;
import fit.iuh.modules.order.repository.OrderRepository;
import fit.iuh.modules.payment.model.PaymentTransaction;
import fit.iuh.modules.payment.repository.PaymentTransactionRepository;
import fit.iuh.modules.payment.controller.PaymentController;
import fit.iuh.modules.payment.strategy.PaymentStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
public class PaymentReconciliationScheduler {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private PaymentController paymentController;

    @Autowired
    @Qualifier("payOSPaymentStrategy")
    private PaymentStrategy payOSPaymentStrategy;

    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void reconcilePayments() {
        log.info("Starting automatic payment reconciliation scheduler job...");
        
        // Find stuck orders: AWAITING_PAYMENT and created > 15 minutes ago
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<Order> stuckOrders = orderRepository.findByStatusAndOrderDateBefore(OrderStatus.AWAITING_PAYMENT, cutoff);
        
        log.info("Found {} stuck pending orders to check.", stuckOrders.size());
        
        for (Order order : stuckOrders) {
            Long orderId = order.getId();
            String orderIdStr = orderId.toString();
            try {
                // Check if it is a PayOS order (has an active transaction in paymentTransactionRepository)
                boolean isPayOS = paymentTransactionRepository.existsByIdAndIsDeletedFalse(orderId);
                
                if (isPayOS) {
                    log.info("Reconciling PayOS payment for stuck Order ID: {}", orderId);
                    String payStatus = payOSPaymentStrategy.verifyPaymentStatus(orderIdStr);
                    
                    if ("PAID".equalsIgnoreCase(payStatus)) {
                        log.info("Reconciliation SUCCESS: Order ID {} is confirmed PAID by PayOS. Settling order.", orderId);
                        
                        // 1. Update standard JPA order
                        order.setStatus(OrderStatus.PENDING);
                        orderRepository.save(order);
                        
                        // 2. Update JPA transaction
                        PaymentTransaction transaction = paymentTransactionRepository.findByIdAndIsDeletedFalse(orderId).orElse(null);
                        if (transaction != null) {
                            transaction.setStatus(PaymentStatus.PAID);
                            paymentTransactionRepository.save(transaction);
                        }
                        
                        // 3. Notify via SSE
                        if (paymentController != null) {
                            paymentController.sendSseNotification(orderId, "PAID");
                        }
                        
                    } else if ("FAILED".equalsIgnoreCase(payStatus)) {
                        log.info("Reconciliation EXPIRED/CANCELLED: Order ID {} has failed on PayOS. Cancelling order.", orderId);
                        
                        // 1. Update standard JPA order
                        order.setStatus(OrderStatus.CANCELED);
                        orderRepository.save(order);
                        
                        // 2. Notify via SSE
                        if (paymentController != null) {
                            paymentController.sendSseNotification(orderId, "CANCELED");
                        }
                    } else {
                        log.info("Reconciliation PENDING: Order ID {} is still unpaid on PayOS.", orderId);
                    }
                } else {
                    log.info("Order ID {} is not a PayOS order. Skipping reconciliation.", orderId);
                }
            } catch (Exception e) {
                log.error("Error reconciling payment for Order ID {}: {}", orderIdStr, e.getMessage(), e);
            }
        }
        
        log.info("Payment reconciliation scheduler job completed successfully.");
    }
}
