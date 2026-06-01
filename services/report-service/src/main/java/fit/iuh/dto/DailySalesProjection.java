package fit.iuh.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface DailySalesProjection {
    LocalDate getDateStr();
    BigDecimal getRevenue();
    Long getOrdersCount();
}
