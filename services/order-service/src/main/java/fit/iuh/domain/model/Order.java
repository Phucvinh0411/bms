package fit.iuh.domain.model;

import fit.iuh.domain.model.OrderStatus;
import fit.iuh.modules.order.state.OrderState;
import fit.iuh.modules.order.strategy.NotificationStrategy;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true)
    private String orderCode;

    @Column(nullable = false)
    private LocalDateTime orderDate;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private BigDecimal subtotalAmount;

    @Column(nullable = false)
    private BigDecimal baseShippingFee;

    @Column(nullable = false)
    private BigDecimal shippingDiscount;

    @Column(nullable = false)
    private BigDecimal orderDiscount;

    @Column(nullable = false)
    private BigDecimal finalTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items;

    @Column(nullable = false)
    private String shippingAddress;

    @Column(nullable = false)
    private Double shippingLatitude;

    @Column(nullable = false)
    private Double shippingLongitude;

    @Transient
    private NotificationStrategy notiStrategy;

    public void changeState(OrderState state) {
        state.process(this);
    }

    public void processOrder() {
        if (status == null) {
            status = OrderStatus.PENDING;
        }
    }

    public void notifyUser() {
        if (notiStrategy != null) {
            notiStrategy.send(userId, "Order " + orderCode + " status: " + status);
        }
    }
}
