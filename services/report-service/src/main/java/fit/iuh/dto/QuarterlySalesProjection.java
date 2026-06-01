package fit.iuh.dto;

import java.math.BigDecimal;

public interface QuarterlySalesProjection {
    Integer getQuarterNumber();
    Integer getYearNumber();
    BigDecimal getRevenue();
    Long getOrdersCount();
}
