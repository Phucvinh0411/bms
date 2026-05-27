package fit.iuh.order.module.order_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private Long userId;
    private LocalDateTime orderDate;
    private BigDecimal totalAmount;
    private BigDecimal subtotalAmount;
    private BigDecimal baseShippingFee;
    private BigDecimal shippingDiscount;
    private BigDecimal orderDiscount;
    private BigDecimal finalTotal;
    private String status;
    private List<OrderItemResponse> items;
    private String checkoutUrl;
}
