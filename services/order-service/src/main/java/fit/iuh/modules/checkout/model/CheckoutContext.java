package fit.iuh.modules.checkout.model;

import fit.iuh.modules.order.dto.OrderItemRequest;
import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderItem;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutContext {
    private Long userId;
    private Long shippingAddressId;
    private String shippingAddress;
    private Double shippingLatitude;
    private Double shippingLongitude;
    private String voucherCode;
    private Double voucherDiscount;
    private List<OrderItemRequest> requestedItems;
    private Boolean previewOnly;
    private Long cartId;
    private List<OrderItem> orderItems;
    private BigDecimal subtotal;
    private BigDecimal baseShippingFee;
    private BigDecimal shippingDiscount;
    private BigDecimal orderDiscount;
    private BigDecimal finalTotal;
    private Order order;

    @Builder.Default
    private java.util.Map<String, String> metadata = new java.util.HashMap<>();

    public void setMetadata(String key, String value) {
        if (this.metadata == null) {
            this.metadata = new java.util.HashMap<>();
        }
        this.metadata.put(key, value);
    }

    public String getMetadata(String key) {
        return this.metadata != null ? this.metadata.get(key) : null;
    }
}
