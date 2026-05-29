package fit.iuh.order.module.client.promotion;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class PromotionVoucherResponse {
    private String code;
    private DiscountType discountType;

    @JsonAlias({"discountAmount", "discountValue"})
    private BigDecimal discountValue;

    @JsonAlias({"minOrderValue", "minimumOrderValue"})
    private BigDecimal minimumOrderValue;

    private BigDecimal maxDiscountAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
    private String description;

    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status);
    }

    public BigDecimal getMinOrderValue() {
        return minimumOrderValue;
    }

    public void setMinOrderValue(BigDecimal minOrderValue) {
        this.minimumOrderValue = minOrderValue;
    }
}
