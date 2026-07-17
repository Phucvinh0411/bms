package fit.iuh.modules.payment.strategy;

import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class MomoStrategy implements PaymentStrategy {
    @Override
    public void pay(BigDecimal amount) {
        // Placeholder for Momo integration.
    }

    @Override
    public String verifyPaymentStatus(String orderId) {
        return "PENDING";
    }
}
