package fit.iuh.modules.payment.strategy;

import java.math.BigDecimal;

public interface PaymentStrategy {
    void pay(BigDecimal amount);
    String verifyPaymentStatus(String orderId);
}
