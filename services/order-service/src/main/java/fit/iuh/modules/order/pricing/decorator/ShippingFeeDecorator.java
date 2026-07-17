package fit.iuh.modules.order.pricing.decorator;

import fit.iuh.infrastructure.client.RoutingClient;
import fit.iuh.modules.shipping.model.ShippingRule;
import fit.iuh.modules.shipping.repository.ShippingRuleRepository;
import java.math.BigDecimal;

public class ShippingFeeDecorator extends PriceDecorator {
    private final RoutingClient routingClient;
    private final ShippingRuleRepository shippingRuleRepository;
    private final Double destinationLatitude;
    private final Double destinationLongitude;
    private BigDecimal cachedBaseShippingFee;

    public ShippingFeeDecorator(
        OrderPrice wrapped,
        RoutingClient routingClient,
        ShippingRuleRepository shippingRuleRepository,
        Double destinationLatitude,
        Double destinationLongitude
    ) {
        super(wrapped);
        this.routingClient = routingClient;
        this.shippingRuleRepository = shippingRuleRepository;
        this.destinationLatitude = destinationLatitude;
        this.destinationLongitude = destinationLongitude;
    }

    @Override
    public BigDecimal getBaseShippingFee() {
        if (cachedBaseShippingFee != null) {
            return cachedBaseShippingFee;
        }

        if (destinationLatitude == null || destinationLongitude == null) {
            cachedBaseShippingFee = BigDecimal.ZERO;
            return cachedBaseShippingFee;
        }

        Double distanceInKm = routingClient.calculateDistance(destinationLatitude, destinationLongitude);
        ShippingRule rule = shippingRuleRepository.findMatchingRule(distanceInKm).orElse(null);
        if (rule != null) {
            cachedBaseShippingFee = rule.getFee();
            return cachedBaseShippingFee;
        }

        // Fallback when shipping rules are missing in DB.
        if (distanceInKm < 50d) {
            cachedBaseShippingFee = BigDecimal.ZERO;
        } else if (distanceInKm <= 500d) {
            cachedBaseShippingFee = BigDecimal.valueOf(25000);
        } else {
            cachedBaseShippingFee = BigDecimal.valueOf(50000);
        }
        return cachedBaseShippingFee;
    }

    @Override
    public BigDecimal getFinalTotal() {
        return wrapped.getFinalTotal().add(getBaseShippingFee());
    }
}
