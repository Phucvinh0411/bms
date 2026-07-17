package fit.iuh.modules.order.state;

import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderStatus;

public class ShippingState implements OrderState {
    @Override
    public void process(Order order) {
        order.setStatus(OrderStatus.COMPLETED);
    }

    @Override
    public void cancel(Order order) {
        order.setStatus(OrderStatus.CANCELED);
    }
}
