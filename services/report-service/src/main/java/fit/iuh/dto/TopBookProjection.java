package fit.iuh.dto;

import java.math.BigDecimal;

public interface TopBookProjection {
    Long getBookId();
    Long getQuantitySold();
    BigDecimal getTotalRevenue();
}
