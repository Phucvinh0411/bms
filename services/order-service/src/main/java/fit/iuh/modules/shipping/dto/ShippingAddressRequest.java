package fit.iuh.modules.shipping.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddressRequest {
    private Long userId;
    private String recipientName;
    private String phoneNumber;
    private String addressLine;
    private Double latitude;
    private Double longitude;
    private Boolean isDefault;
}
