package fit.iuh.modules.order.state;

import fit.iuh.domain.model.Order;

public interface OrderState {
    void process(Order order);

    void cancel(Order order);
}
