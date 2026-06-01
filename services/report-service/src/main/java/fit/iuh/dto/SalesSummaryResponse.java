package fit.iuh.dto;

import java.math.BigDecimal;

public record SalesSummaryResponse(
    BigDecimal totalRevenue,
    Long totalOrders,
    Long totalBooksSold
) {}
