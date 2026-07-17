package fit.iuh.modules.order.pricing.decorator;

import java.math.BigDecimal;

public class BaseOrderPrice implements OrderPrice {
    private final BigDecimal baseAmount;

    public BaseOrderPrice(BigDecimal baseAmount) {
        this.baseAmount = baseAmount;
    }

    @Override
    public BigDecimal getSubtotal() {
        return baseAmount;
    }

    @Override
    public BigDecimal getBaseShippingFee() {
        return BigDecimal.ZERO;
    }

    @Override
    public BigDecimal getShippingDiscount() {
        return BigDecimal.ZERO;
    }

    @Override
    public BigDecimal getOrderDiscount() {
        return BigDecimal.ZERO;
    }

    @Override
    public BigDecimal getFinalTotal() {
        return baseAmount.max(BigDecimal.ZERO);
    }
}
