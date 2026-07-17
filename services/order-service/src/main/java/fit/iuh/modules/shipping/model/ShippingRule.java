package fit.iuh.modules.shipping.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shipping_rules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "min_distance", nullable = false)
    private Double minDistance;

    @Column(name = "max_distance")
    private Double maxDistance;

    @Column(nullable = false)
    private BigDecimal fee;
}
