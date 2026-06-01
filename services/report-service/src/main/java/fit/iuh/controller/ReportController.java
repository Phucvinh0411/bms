package fit.iuh.controller;

import fit.iuh.dto.DailySalesProjection;
import fit.iuh.dto.WeeklySalesProjection;
import fit.iuh.dto.MonthlySalesProjection;
import fit.iuh.dto.QuarterlySalesProjection;
import fit.iuh.dto.YearlySalesProjection;
import fit.iuh.dto.SalesSummaryResponse;
import fit.iuh.dto.TopBookProjection;
import fit.iuh.repository.ReportOrderItemRepository;
import fit.iuh.repository.ReportOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportOrderRepository reportOrderRepository;
    private final ReportOrderItemRepository reportOrderItemRepository;

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
            "service", "report-service",
            "status", "READY",
            "generatedAt", Instant.now().toString(),
            "message", "Report service is reachable from admin"
        );
    }

    @GetMapping("/sales-summary")
    public SalesSummaryResponse getSalesSummary() {
        BigDecimal totalRevenue = reportOrderRepository.sumFinalTotal();
        Long totalOrders = reportOrderRepository.count();
        Long totalBooksSold = reportOrderRepository.sumTotalBooksSold();

        return new SalesSummaryResponse(
            totalRevenue != null ? totalRevenue : BigDecimal.ZERO,
            totalOrders != null ? totalOrders : 0L,
            totalBooksSold != null ? totalBooksSold : 0L
        );
    }

    @GetMapping("/daily-sales")
    public List<DailySalesProjection> getDailySales() {
        // Lấy báo cáo 7 ngày gần nhất (từ 00:00:00 của 7 ngày trước)
        LocalDateTime startDate = LocalDateTime.now().minusDays(7).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return reportOrderRepository.getDailySales(startDate);
    }

    @GetMapping("/weekly-sales")
    public List<WeeklySalesProjection> getWeeklySales() {
        // Lấy báo cáo 8 tuần gần nhất
        LocalDateTime startDate = LocalDateTime.now().minusWeeks(8).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return reportOrderRepository.getWeeklySales(startDate);
    }

    @GetMapping("/monthly-sales")
    public List<MonthlySalesProjection> getMonthlySales() {
        // Lấy báo cáo 12 tháng gần nhất
        LocalDateTime startDate = LocalDateTime.now().minusMonths(12).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return reportOrderRepository.getMonthlySales(startDate);
    }

    @GetMapping("/quarterly-sales")
    public List<QuarterlySalesProjection> getQuarterlySales() {
        // Lấy báo cáo 8 quý gần nhất (2 năm)
        LocalDateTime startDate = LocalDateTime.now().minusMonths(24).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return reportOrderRepository.getQuarterlySales(startDate);
    }

    @GetMapping("/yearly-sales")
    public List<YearlySalesProjection> getYearlySales() {
        return reportOrderRepository.getYearlySales();
    }

    @GetMapping("/top-books")
    public List<TopBookProjection> getTopSellingBooks(@RequestParam(value = "limit", defaultValue = "5") int limit) {
        return reportOrderItemRepository.getTopSellingBooks(limit);
    }
}
