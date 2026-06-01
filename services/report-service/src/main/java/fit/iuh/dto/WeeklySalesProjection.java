package fit.iuh.dto;

import java.math.BigDecimal;

public interface WeeklySalesProjection {
    Integer getWeekNumber();
    Integer getYearNumber();
    BigDecimal getRevenue();
    Long getOrdersCount();
}
