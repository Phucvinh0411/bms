package fit.iuh.semanticsearch;

import fit.iuh.order.module.domain.enums.BookStatus;

import java.math.BigDecimal;

public interface SemanticBookSearchProjection {
    Long getId();

    String getTitle();

    String getAuthor();

    String getPublisher();

    BigDecimal getPrice();

    Integer getStockQuantity();

    BookStatus getStatus();

    Long getCategoryId();

    String getImageUrl();

    String getDescription();

    String getCategoryName();

    Long getParentCategoryId();

    Double getCombinedScore();
}
