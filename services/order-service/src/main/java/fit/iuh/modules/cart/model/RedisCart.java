package fit.iuh.modules.cart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RedisCart implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long userId;
    
    @Builder.Default
    private List<RedisCartItem> items = new ArrayList<>();
}
