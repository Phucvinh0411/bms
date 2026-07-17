package fit.iuh.modules.shipping.repository;

import fit.iuh.modules.shipping.model.ShippingRule;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShippingRuleRepository extends JpaRepository<ShippingRule, Long> {
    @Query("select r from ShippingRule r "
        + "where :distance >= r.minDistance "
        + "and (r.maxDistance is null or :distance < r.maxDistance) "
        + "order by r.minDistance desc")
    Optional<ShippingRule> findMatchingRule(@Param("distance") Double distance);
}
