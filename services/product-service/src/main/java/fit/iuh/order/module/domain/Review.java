package fit.iuh.order.module.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String content; // Nội dung đánh giá

    @Column(nullable = false)
    private int rating; // Số sao (1 đến 5)

    // Lưu tên người đánh giá
    @Column(nullable = false)
    private String userName;

    // Lưu ID người đánh giá để xác định quyền sửa/xóa
    private Long userId;

    // Danh sách đường dẫn ảnh/video đính kèm
    @ElementCollection
    @CollectionTable(name = "review_media", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "media_url", length = 500)
    private java.util.List<String> mediaUrls = new java.util.ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Liên kết nhiều Review thuộc về 1 Book
    @ManyToOne
    @JoinColumn(name = "book_id")
    @JsonIgnore // Thêm dòng này để tránh lỗi vòng lặp vô hạn khi trả về JSON
    private Book book;
}
