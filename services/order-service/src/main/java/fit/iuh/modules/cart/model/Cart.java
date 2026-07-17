package fit.iuh.modules.cart.model;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart {
    private Long id;
    private Long userId;
    private BigDecimal totalEstimated;
}
