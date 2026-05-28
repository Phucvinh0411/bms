package fit.iuh.order.module.semanticsearch;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface BookSemanticRepository extends JpaRepository<fit.iuh.order.module.domain.Book, Long> {

    @Query(value = "SELECT * FROM books WHERE embedding IS NULL", nativeQuery = true)
    List<fit.iuh.order.module.domain.Book> findBooksWithoutEmbedding();

    @Query(value = "SELECT * FROM books WHERE fts_tokens IS NULL", nativeQuery = true)
    List<fit.iuh.order.module.domain.Book> findBooksWithoutFtsTokens();

    @Query(value = "SELECT "
        + "b.id as id, "
        + "b.title as title, "
        + "b.author as author, "
        + "b.publisher as publisher, "
        + "b.price as price, "
        + "b.stock_quantity as stockQuantity, "
        + "b.status as status, "
        + "b.category_id as categoryId, "
        + "b.image_url as imageUrl, "
        + "b.description as description, "
        + "c.name as categoryName, "
        + "b.parent_category_id as parentCategoryId "
        + "FROM books b "
        + "LEFT JOIN categories c ON c.id = b.category_id "
        + "WHERE b.status = 'AVAILABLE' AND b.embedding IS NOT NULL "
        + "ORDER BY b.embedding <=> cast(:queryVector as vector) "
        + "LIMIT :limit", nativeQuery = true)
    List<SemanticBookSearchProjection> semanticSearch(@Param("queryVector") String queryVector, @Param("limit") int limit);

    @Modifying
    @Query(value = "UPDATE books SET embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
    int updateEmbedding(@Param("id") Long id, @Param("embedding") String embedding);

    @Modifying
    @Query(value = "UPDATE books SET fts_tokens = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, '')) WHERE id = :id", nativeQuery = true)
    int updateFtsTokens(@Param("id") Long id);

    @Query(value = "SELECT "
        + "b.id as id, "
        + "b.title as title, "
        + "b.author as author, "
        + "b.publisher as publisher, "
        + "b.price as price, "
        + "b.stock_quantity as stockQuantity, "
        + "b.status as status, "
        + "b.category_id as categoryId, "
        + "b.image_url as imageUrl, "
        + "b.description as description, "
        + "c.name as categoryName, "
        + "b.parent_category_id as parentCategoryId, "
        + "((CASE WHEN b.embedding IS NOT NULL THEN (1 - (b.embedding <=> cast(:vector as vector))) ELSE 0 END) * 0.7 + "
        + "(coalesce(ts_rank_cd(b.fts_tokens, plainto_tsquery('simple', :query)), 0) * 0.2) + "
        + "(CASE WHEN b.title ILIKE concat('%', :query, '%') THEN 0.1 ELSE 0 END)) as combinedScore "
        + "FROM books b "
        + "LEFT JOIN categories c ON c.id = b.category_id "
        + "WHERE b.status IN ('ACTIVE', 'AVAILABLE') "
        + "AND (b.is_deleted IS NULL OR b.is_deleted = false) "
        + "AND (b.title ILIKE concat('%', :query, '%') "
        + "  OR b.author ILIKE concat('%', :query, '%') "
        + "  OR b.publisher ILIKE concat('%', :query, '%') "
        + "  OR b.description ILIKE concat('%', :query, '%') "
        + "  OR (b.fts_tokens IS NOT NULL AND b.fts_tokens @@ plainto_tsquery('simple', :query))) "
        + "ORDER BY combinedScore DESC "
        + "LIMIT :limit OFFSET :offset", nativeQuery = true)
    List<SemanticBookSearchProjection> hybridSearch(@Param("vector") String vector,
                                                    @Param("query") String query,
                                                    @Param("limit") int limit,
                                                    @Param("offset") int offset,
                                                    @Param("categoryIdsCsv") String categoryIdsCsv,
                                                    @Param("minPrice") BigDecimal minPrice,
                                                    @Param("maxPrice") BigDecimal maxPrice);

    // Fallback: full-text + keyword search when embedding (Ollama) is unavailable
    @Query(value = "SELECT "
        + "b.id as id, "
        + "b.title as title, "
        + "b.author as author, "
        + "b.publisher as publisher, "
        + "b.price as price, "
        + "b.stock_quantity as stockQuantity, "
        + "b.status as status, "
        + "b.category_id as categoryId, "
        + "b.image_url as imageUrl, "
        + "b.description as description, "
        + "c.name as categoryName, "
        + "b.parent_category_id as parentCategoryId, "
        + "(CASE WHEN b.title ILIKE concat('%', :query, '%') THEN 1.0 "
        + "      WHEN b.author ILIKE concat('%', :query, '%') THEN 0.8 "
        + "      WHEN b.publisher ILIKE concat('%', :query, '%') THEN 0.6 "
        + "      ELSE 0.3 END) as combinedScore "
        + "FROM books b "
        + "LEFT JOIN categories c ON c.id = b.category_id "
        + "WHERE b.status IN ('ACTIVE', 'AVAILABLE') "
        + "AND (b.is_deleted IS NULL OR b.is_deleted = false) "
        + "AND (b.title ILIKE concat('%', :query, '%') "
        + "  OR b.author ILIKE concat('%', :query, '%') "
        + "  OR b.publisher ILIKE concat('%', :query, '%') "
        + "  OR b.description ILIKE concat('%', :query, '%')) "
        + "AND (:minPrice IS NULL OR b.price >= :minPrice) "
        + "AND (:maxPrice IS NULL OR b.price <= :maxPrice) "
        + "AND (coalesce(:categoryIdsCsv, '') = '' OR b.category_id = ANY(string_to_array(:categoryIdsCsv, ',')::bigint[])) "
        + "ORDER BY combinedScore DESC "
        + "LIMIT :limit OFFSET :offset", nativeQuery = true)
    List<SemanticBookSearchProjection> textSearch(@Param("query") String query,
                                                  @Param("limit") int limit,
                                                  @Param("offset") int offset,
                                                  @Param("categoryIdsCsv") String categoryIdsCsv,
                                                  @Param("minPrice") BigDecimal minPrice,
                                                  @Param("maxPrice") BigDecimal maxPrice);
}
