package fit.iuh.modules.payment.strategy;

import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class VNPayStrategy implements PaymentStrategy {
    @Override
    public void pay(BigDecimal amount) {
        // Placeholder for VNPay integration.
    }

    @Override
    public String verifyPaymentStatus(String orderId) {
        return "PENDING";
    }
}
