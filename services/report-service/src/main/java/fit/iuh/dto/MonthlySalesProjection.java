package fit.iuh.dto;

import java.math.BigDecimal;

public interface MonthlySalesProjection {
    Integer getMonthNumber();
    Integer getYearNumber();
    BigDecimal getRevenue();
    Long getOrdersCount();
}
