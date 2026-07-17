package fit.iuh.modules.cart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {
    private Long id;
    private Long cartId;
    private Long bookId;
    private int quantity;
}
