package fit.iuh.order.module.domain;

import fit.iuh.order.module.domain.enums.BookStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "books")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(name = "publisher") // Đổi tên cột từ sku thành publisher
    private String publisher;

    // Trong file entity/Book.java

    @Column(name = "author")
    private String author;

    private BigDecimal price;

    private int stockQuantity;

    @Enumerated(EnumType.STRING)
    private BookStatus status;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Transient
    @Column(name = "embedding", columnDefinition = "vector(768)")
    private float[] embedding;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @OneToMany(mappedBy = "book", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews;

    @Column(name = "parent_category_id")
    private Long parentCategoryId;

    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "book", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookImage> secondaryImages = new ArrayList<>();

    public String buildTextForEmbedding() {
        String categoryName = category != null ? category.getName() : "";
        return "Tiêu đề: " + title
            + ". Tác giả: " + author
            + ". Thể loại: " + categoryName
            + ". Tóm tắt: " + description;
    }
}
