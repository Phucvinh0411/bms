package fit.iuh.dto;

import java.math.BigDecimal;

public interface YearlySalesProjection {
    Integer getYearNumber();
    BigDecimal getRevenue();
    Long getOrdersCount();
}
