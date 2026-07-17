package fit.iuh.infrastructure.client.promotion;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

// @Component
// @Primary
public class MockPromotionClient implements PromotionClient {
    private final List<PromotionVoucherResponse> vouchers = List.of(
        buildVoucher(
            "FREESHIP_20K",
            DiscountType.FREE_SHIPPING,
            BigDecimal.ZERO,
            BigDecimal.valueOf(20000),
            BigDecimal.ZERO
        ),
        buildVoucher(
            "DISCOUNT_10PERCENT",
            DiscountType.PERCENTAGE,
            BigDecimal.valueOf(10),
            BigDecimal.valueOf(30000),
            BigDecimal.valueOf(100000)
        )
    );

    @Override
    public Optional<PromotionVoucherResponse> getVoucherByCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }

        String normalized = code.trim().toUpperCase(Locale.ROOT);
        return vouchers.stream()
            .filter(voucher -> normalized.equals(voucher.getCode()))
            .findFirst();
    }

    private PromotionVoucherResponse buildVoucher(
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal maxDiscountAmount,
        BigDecimal minOrderValue
    ) {
        PromotionVoucherResponse response = new PromotionVoucherResponse();
        response.setCode(code);
        response.setDiscountType(discountType);
        response.setDiscountValue(discountValue);
        response.setMaxDiscountAmount(maxDiscountAmount);
        response.setMinOrderValue(minOrderValue);
        response.setStatus("ACTIVE");
        response.setDescription("mock");
        return response;
    }
}
