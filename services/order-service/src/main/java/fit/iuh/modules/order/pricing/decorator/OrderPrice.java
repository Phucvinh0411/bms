package fit.iuh.modules.order.pricing.decorator;

import java.math.BigDecimal;

public interface OrderPrice {
    BigDecimal getSubtotal();

    BigDecimal getBaseShippingFee();

    BigDecimal getShippingDiscount();

    BigDecimal getOrderDiscount();

    BigDecimal getFinalTotal();

    default BigDecimal calculate() {
        return getFinalTotal();
    }
}
