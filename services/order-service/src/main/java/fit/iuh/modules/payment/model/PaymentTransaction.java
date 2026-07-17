package fit.iuh.modules.payment.model;

import fit.iuh.domain.model.PaymentStatus;
import fit.iuh.modules.payment.strategy.PaymentStrategy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "payment_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransaction {
    @Id
    private Long id;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Transient
    private PaymentStrategy strategy;

    public void executePayment() {
        if (strategy == null) {
            throw new IllegalStateException("Payment strategy must be set before execution");
        }
        strategy.pay(amount);
    }
}
