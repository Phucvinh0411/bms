package fit.iuh.modules.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {
    private Long userId;
    private Long shippingAddressId;
    private String shippingAddress;
    private Double shippingLatitude;
    private Double shippingLongitude;
    private String voucherCode;
    private List<OrderItemRequest> items;
    private String paymentMethod;
    private String returnUrl;
    private String cancelUrl;
}
