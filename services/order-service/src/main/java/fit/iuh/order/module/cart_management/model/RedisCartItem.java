package fit.iuh.order.module.cart_management.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RedisCartItem implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long bookId;
    private Integer quantity;
}
