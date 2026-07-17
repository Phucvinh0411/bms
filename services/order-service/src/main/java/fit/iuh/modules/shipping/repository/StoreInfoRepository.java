package fit.iuh.modules.shipping.repository;

import fit.iuh.modules.shipping.model.StoreInfo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreInfoRepository extends JpaRepository<StoreInfo, Long> {
    Optional<StoreInfo> findTopByOrderByIdAsc();
}
