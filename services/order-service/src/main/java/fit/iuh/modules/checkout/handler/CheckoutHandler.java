package fit.iuh.modules.checkout.handler;

import fit.iuh.modules.checkout.model.CheckoutContext;

public abstract class CheckoutHandler {
    protected CheckoutHandler nextHandler;

    public CheckoutHandler setNextHandler(CheckoutHandler nextHandler) {
        this.nextHandler = nextHandler;
        return nextHandler;
    }

    public void handle(CheckoutContext context) {
        process(context);
        handleNext(context);
    }

    protected void handleNext(CheckoutContext context) {
        if (nextHandler != null) {
            nextHandler.handle(context);
        }
    }

    protected abstract void process(CheckoutContext context);
}
