package fit.iuh.modules.order.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPreviewResponse {
    private BigDecimal subtotalAmount;
    private BigDecimal baseShippingFee;
    private BigDecimal shippingDiscount;
    private BigDecimal orderDiscount;
    private BigDecimal finalTotal;
    private BigDecimal totalAmount;
}
