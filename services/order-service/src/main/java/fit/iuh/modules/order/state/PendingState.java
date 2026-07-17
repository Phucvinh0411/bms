package fit.iuh.modules.order.state;

import fit.iuh.domain.model.Order;
import fit.iuh.domain.model.OrderStatus;

public class PendingState implements OrderState {
    @Override
    public void process(Order order) {
        order.setStatus(OrderStatus.CONFIRMED);
    }

    @Override
    public void cancel(Order order) {
        order.setStatus(OrderStatus.CANCELED);
    }
}
