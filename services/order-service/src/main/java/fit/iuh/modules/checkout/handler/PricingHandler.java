package fit.iuh.modules.checkout.handler;

import fit.iuh.modules.checkout.model.CheckoutContext;
import fit.iuh.infrastructure.client.RoutingClient;
import fit.iuh.infrastructure.client.promotion.PromotionClient;
import fit.iuh.modules.order.pricing.decorator.BaseOrderPrice;
import fit.iuh.modules.order.pricing.decorator.OrderPrice;
import fit.iuh.modules.order.pricing.decorator.ShippingFeeDecorator;
import fit.iuh.modules.order.pricing.decorator.VoucherDecorator;
import fit.iuh.modules.shipping.repository.ShippingRuleRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PricingHandler extends CheckoutHandler {
    private final RoutingClient routingClient;
    private final ShippingRuleRepository shippingRuleRepository;
    private final PromotionClient promotionClient;

    @Override
    protected void process(CheckoutContext context) {
        BigDecimal subtotal = context.getSubtotal();
        if (subtotal == null) {
            subtotal = BigDecimal.ZERO;
        }

        OrderPrice price = new BaseOrderPrice(subtotal);
        price = new ShippingFeeDecorator(
            price,
            routingClient,
            shippingRuleRepository,
            context.getShippingLatitude(),
            context.getShippingLongitude()
        );
        price = new VoucherDecorator(price, promotionClient, context.getVoucherCode());

        context.setBaseShippingFee(price.getBaseShippingFee());
        context.setShippingDiscount(price.getShippingDiscount());
        context.setOrderDiscount(price.getOrderDiscount());
        context.setFinalTotal(price.getFinalTotal());
    }
}
