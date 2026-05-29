package fit.iuh.semanticsearch;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class HybridSearchService {

    private static final int TOP_K_CANDIDATES = 20;

    private final SemanticEmbeddingService semanticEmbeddingService;
    private final BookSemanticRepository bookSemanticRepository;

    public HybridSearchService(SemanticEmbeddingService semanticEmbeddingService,
                               BookSemanticRepository bookSemanticRepository) {
        this.semanticEmbeddingService = semanticEmbeddingService;
        this.bookSemanticRepository = bookSemanticRepository;
    }

    public List<SemanticBookSearchDTO> hybridSearch(String query,
                                                    int limit,
                                                    int offset,
                                                    String categoryIdsCsv,
                                                    BigDecimal minPrice,
                                                    BigDecimal maxPrice) {
        try {
            float[] embedding = generateQueryEmbedding(query);
            return searchByVector(
                toVectorLiteral(embedding),
                query,
                limit,
                offset,
                categoryIdsCsv,
                minPrice,
                maxPrice
            );
        } catch (Exception e) {
            System.out.println("Falling back to keyword/text search for query: " + query + " due to error: " + e.getMessage());
            return searchByText(query, limit, offset, categoryIdsCsv, minPrice, maxPrice);
        }
    }

    public float[] generateQueryEmbedding(String query) {
        return semanticEmbeddingService.generateEmbedding(query);
    }

    public String toVectorLiteral(float[] embedding) {
        return semanticEmbeddingService.toVectorLiteral(embedding);
    }

    public List<SemanticBookSearchDTO> searchByVector(String vectorLiteral,
                                                      String query,
                                                      int limit,
                                                      int offset,
                                                      String categoryIdsCsv,
                                                      BigDecimal minPrice,
                                                      BigDecimal maxPrice) {
        int safeLimit = limit > 0 ? limit : 10;
        int safeOffset = Math.max(offset, 0);
        int candidateLimit = Math.max(TOP_K_CANDIDATES, safeOffset + safeLimit);

        return sliceTopK(
            bookSemanticRepository.hybridSearch(vectorLiteral, query, candidateLimit, 0, categoryIdsCsv, minPrice, maxPrice),
            safeOffset,
            safeLimit
        )
            .stream()
            .map(this::toDto)
            .toList();
    }

    public List<SemanticBookSearchDTO> searchByText(String query,
                                                     int limit,
                                                     int offset,
                                                     String categoryIdsCsv,
                                                     BigDecimal minPrice,
                                                     BigDecimal maxPrice) {
        int safeLimit = limit > 0 ? limit : 10;
        int safeOffset = Math.max(offset, 0);
        int candidateLimit = Math.max(TOP_K_CANDIDATES, safeOffset + safeLimit);

        return sliceTopK(
            bookSemanticRepository.textSearch(query, candidateLimit, 0, categoryIdsCsv, minPrice, maxPrice),
            safeOffset,
            safeLimit
        )
            .stream()
            .map(this::toDto)
            .toList();
    }

    private <T> List<T> sliceTopK(List<T> rankedBooks, int offset, int limit) {
        if (rankedBooks.isEmpty() || offset >= rankedBooks.size()) {
            return List.of();
        }

        int toIndex = Math.min(offset + limit, rankedBooks.size());
        return rankedBooks.subList(offset, toIndex);
    }

    private SemanticBookSearchDTO toDto(SemanticBookSearchProjection book) {
        return new SemanticBookSearchDTO(
            book.getId(),
            book.getTitle(),
            book.getAuthor(),
            book.getPublisher(),
            book.getPrice(),
            book.getStockQuantity(),
            book.getStatus(),
            book.getCategoryId(),
            book.getImageUrl(),
            book.getDescription(),
            book.getCategoryName(),
            book.getParentCategoryId(),
            book.getCombinedScore()
        );
    }
}
