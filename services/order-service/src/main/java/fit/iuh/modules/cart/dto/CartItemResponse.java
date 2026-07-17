package fit.iuh.modules.cart.dto;

public record CartItemResponse(
    Long id,
    Long cartId,
    Long bookId,
    int quantity
) {
}
