package fit.iuh.infrastructure.messaging;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderCompletedEvent(
    String eventId,
    Long orderId,
    Long userId,
    BigDecimal totalAmount,
    BigDecimal subtotalAmount,
    BigDecimal baseShippingFee,
    BigDecimal shippingDiscount,
    BigDecimal orderDiscount,
    BigDecimal finalTotal,
    LocalDateTime completedAt,
    List<OrderItemDto> items
) implements Serializable {
    
    public record OrderItemDto(
        Long bookId,
        Integer quantity,
        BigDecimal priceAtPurchase
    ) implements Serializable {}
}
