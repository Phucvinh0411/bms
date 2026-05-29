package fit.iuh.promotion.module.dto;

import fit.iuh.promotion.module.domain.enums.DiscountType;
import fit.iuh.promotion.module.domain.enums.VoucherStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class VoucherResponseDTO {
    private Long id;
    private String code;
    private String summary; // Kết hợp code và description cho người dùng
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minimumOrderValue;
    private BigDecimal maxDiscountAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private VoucherStatus status;
    private String description;
}