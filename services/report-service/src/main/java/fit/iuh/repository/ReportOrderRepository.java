package fit.iuh.repository;

import fit.iuh.dto.DailySalesProjection;
import fit.iuh.dto.WeeklySalesProjection;
import fit.iuh.dto.MonthlySalesProjection;
import fit.iuh.dto.QuarterlySalesProjection;
import fit.iuh.dto.YearlySalesProjection;
import fit.iuh.model.ReportOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportOrderRepository extends JpaRepository<ReportOrder, Long> {

    @Query("SELECT COALESCE(SUM(o.finalTotal), 0) FROM ReportOrder o")
    BigDecimal sumFinalTotal();

    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM ReportOrderItem i")
    Long sumTotalBooksSold();

    @Query(value = "SELECT CAST(completed_at AS date) AS dateStr, SUM(final_total) AS revenue, COUNT(*) AS ordersCount " +
                   "FROM report_orders " +
                   "WHERE completed_at >= :startDate " +
                   "GROUP BY CAST(completed_at AS date) " +
                   "ORDER BY dateStr ASC", nativeQuery = true)
    List<DailySalesProjection> getDailySales(@Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT CAST(EXTRACT(WEEK FROM completed_at) AS integer) AS weekNumber, " +
                   "CAST(EXTRACT(YEAR FROM completed_at) AS integer) AS yearNumber, " +
                   "SUM(final_total) AS revenue, COUNT(*) AS ordersCount " +
                   "FROM report_orders " +
                   "WHERE completed_at >= :startDate " +
                   "GROUP BY yearNumber, weekNumber " +
                   "ORDER BY yearNumber ASC, weekNumber ASC", nativeQuery = true)
    List<WeeklySalesProjection> getWeeklySales(@Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT CAST(EXTRACT(MONTH FROM completed_at) AS integer) AS monthNumber, " +
                   "CAST(EXTRACT(YEAR FROM completed_at) AS integer) AS yearNumber, " +
                   "SUM(final_total) AS revenue, COUNT(*) AS ordersCount " +
                   "FROM report_orders " +
                   "WHERE completed_at >= :startDate " +
                   "GROUP BY yearNumber, monthNumber " +
                   "ORDER BY yearNumber ASC, monthNumber ASC", nativeQuery = true)
    List<MonthlySalesProjection> getMonthlySales(@Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT CAST(EXTRACT(QUARTER FROM completed_at) AS integer) AS quarterNumber, " +
                   "CAST(EXTRACT(YEAR FROM completed_at) AS integer) AS yearNumber, " +
                   "SUM(final_total) AS revenue, COUNT(*) AS ordersCount " +
                   "FROM report_orders " +
                   "WHERE completed_at >= :startDate " +
                   "GROUP BY yearNumber, quarterNumber " +
                   "ORDER BY yearNumber ASC, quarterNumber ASC", nativeQuery = true)
    List<QuarterlySalesProjection> getQuarterlySales(@Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT CAST(EXTRACT(YEAR FROM completed_at) AS integer) AS yearNumber, " +
                   "SUM(final_total) AS revenue, COUNT(*) AS ordersCount " +
                   "FROM report_orders " +
                   "GROUP BY yearNumber " +
                   "ORDER BY yearNumber ASC", nativeQuery = true)
    List<YearlySalesProjection> getYearlySales();
}

