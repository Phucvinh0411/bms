package fit.iuh.repository;

import fit.iuh.dto.TopBookProjection;
import fit.iuh.model.ReportOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportOrderItemRepository extends JpaRepository<ReportOrderItem, Long> {

    @Query(value = "SELECT book_id AS bookId, SUM(quantity) AS quantitySold, SUM(price_at_purchase * quantity) AS totalRevenue " +
                   "FROM report_order_items " +
                   "GROUP BY book_id " +
                   "ORDER BY quantitySold DESC " +
                   "LIMIT :limit", nativeQuery = true)
    List<TopBookProjection> getTopSellingBooks(@Param("limit") int limit);
}
