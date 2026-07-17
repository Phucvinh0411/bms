package fit.iuh.modules.order.pricing.decorator;

import fit.iuh.infrastructure.client.promotion.DiscountType;
import fit.iuh.infrastructure.client.promotion.PromotionClient;
import fit.iuh.infrastructure.client.promotion.PromotionVoucherResponse;
import java.math.BigDecimal;
import java.util.Optional;

public class VoucherDecorator extends PriceDecorator {
    private final PromotionClient promotionClient;
    private final String voucherCode;
    private BigDecimal cachedShippingDiscount;
    private BigDecimal cachedOrderDiscount;

    public VoucherDecorator(OrderPrice wrapped, PromotionClient promotionClient, String voucherCode) {
        super(wrapped);
        this.promotionClient = promotionClient;
        this.voucherCode = voucherCode;
    }

    @Override
    public BigDecimal getShippingDiscount() {
        ensureDiscountsCalculated();
        return cachedShippingDiscount;
    }

    @Override
    public BigDecimal getOrderDiscount() {
        ensureDiscountsCalculated();
        return cachedOrderDiscount;
    }

    @Override
    public BigDecimal getFinalTotal() {
        ensureDiscountsCalculated();
        BigDecimal subtotal = wrapped.getFinalTotal();
        BigDecimal total = subtotal
            .subtract(cachedShippingDiscount)
            .subtract(cachedOrderDiscount);
        return total.max(BigDecimal.ZERO);
    }

    private void ensureDiscountsCalculated() {
        if (cachedShippingDiscount != null && cachedOrderDiscount != null) {
            return;
        }

        cachedShippingDiscount = BigDecimal.ZERO;
        cachedOrderDiscount = BigDecimal.ZERO;

        if (voucherCode == null || voucherCode.isBlank()) {
            return;
        }

        Optional<PromotionVoucherResponse> voucherOpt = promotionClient.getVoucherByCode(voucherCode.trim());
        if (voucherOpt.isEmpty()) {
            return;
        }

        PromotionVoucherResponse voucher = voucherOpt.get();
        if (!voucher.isActive()) {
            return;
        }

        BigDecimal subtotal = wrapped.getSubtotal();
        if (voucher.getMinOrderValue() != null && subtotal.compareTo(voucher.getMinOrderValue()) < 0) {
            return;
        }

        if (voucher.getDiscountType() == null) {
            return;
        }

        DiscountType discountType = voucher.getDiscountType();
        BigDecimal discountValue = valueOrZero(voucher.getDiscountValue());
        BigDecimal maxDiscount = voucher.getMaxDiscountAmount();

        if (discountType == DiscountType.FREE_SHIPPING) {
            BigDecimal baseShipping = wrapped.getBaseShippingFee();
            cachedShippingDiscount = capDiscount(baseShipping, maxDiscount);
            return;
        }

        BigDecimal discountAmount;
        if (discountType == DiscountType.PERCENTAGE) {
            discountAmount = subtotal.multiply(discountValue)
                .divide(BigDecimal.valueOf(100));
        } else {
            discountAmount = discountValue;
        }

        cachedOrderDiscount = capDiscount(discountAmount, maxDiscount);
    }

    private BigDecimal capDiscount(BigDecimal discount, BigDecimal maxDiscount) {
        if (maxDiscount == null || maxDiscount.compareTo(BigDecimal.ZERO) <= 0) {
            return discount.max(BigDecimal.ZERO);
        }
        return discount.min(maxDiscount).max(BigDecimal.ZERO);
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
