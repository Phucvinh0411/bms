package fit.iuh.modules.order.state;

import fit.iuh.domain.model.Order;

public class CompletedState implements OrderState {
    @Override
    public void process(Order order) {
        // Completed state is terminal in current flow.
    }

    @Override
    public void cancel(Order order) {
        throw new IllegalStateException("Cannot cancel an already completed order");
    }
}
