package fit.iuh.modules.order.pricing.decorator;

import java.math.BigDecimal;

public abstract class PriceDecorator implements OrderPrice {
    protected final OrderPrice wrapped;

    protected PriceDecorator(OrderPrice wrapped) {
        this.wrapped = wrapped;
    }

    @Override
    public BigDecimal getSubtotal() {
        return wrapped.getSubtotal();
    }

    @Override
    public BigDecimal getBaseShippingFee() {
        return wrapped.getBaseShippingFee();
    }

    @Override
    public BigDecimal getShippingDiscount() {
        return wrapped.getShippingDiscount();
    }

    @Override
    public BigDecimal getOrderDiscount() {
        return wrapped.getOrderDiscount();
    }

    @Override
    public BigDecimal getFinalTotal() {
        return wrapped.getFinalTotal();
    }
}
