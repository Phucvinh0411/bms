package fit.iuh.promotion.module.domain;

import fit.iuh.promotion.module.domain.enums.DiscountType;
import fit.iuh.promotion.module.domain.enums.VoucherStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code; // Ví dụ: KM2026

    @Enumerated(EnumType.STRING)
    private DiscountType discountType; // Thêm loại giảm giá

    private BigDecimal discountAmount; // Số tiền giảm hoặc % (maps to discountValue in DTO)

    private BigDecimal minOrderValue; // Giá trị đơn hàng tối thiểu (maps to minimumOrderValue in DTO)

    private BigDecimal maxDiscountAmount; // Số tiền giảm tối đa

    private LocalDateTime startDate; // Ngày bắt đầu hiệu lực

    private LocalDateTime endDate; // Ngày hết hạn

    @Enumerated(EnumType.STRING)
    private VoucherStatus status;

    private String description; // AI sẽ dùng trường này để hiểu mục đích voucher

    private boolean isDeleted = false; // Hỗ trợ xóa mềm voucher
}