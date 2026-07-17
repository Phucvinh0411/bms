package fit.iuh.modules.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateCartItemQuantityRequest(
    @NotNull Long userId,
    @NotNull Long bookId,
    @NotNull @Min(1) Integer quantity
) {
}
