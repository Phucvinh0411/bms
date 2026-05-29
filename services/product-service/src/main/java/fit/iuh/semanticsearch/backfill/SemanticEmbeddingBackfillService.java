package fit.iuh.semanticsearch.backfill;

import fit.iuh.order.module.domain.Book;
import fit.iuh.semanticsearch.BookSemanticRepository;
import fit.iuh.semanticsearch.SemanticEmbeddingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SemanticEmbeddingBackfillService {

    private static final Logger log = LoggerFactory.getLogger(SemanticEmbeddingBackfillService.class);

    private final SemanticEmbeddingService semanticEmbeddingService;
    private final BookSemanticRepository bookSemanticRepository;

    public SemanticEmbeddingBackfillService(SemanticEmbeddingService semanticEmbeddingService,
                                            BookSemanticRepository bookSemanticRepository) {
        this.semanticEmbeddingService = semanticEmbeddingService;
        this.bookSemanticRepository = bookSemanticRepository;
    }

    @Transactional
    public void backfillMissingEmbeddings() {
        List<Book> booksWithoutEmbedding = bookSemanticRepository.findBooksWithoutEmbedding();
        if (booksWithoutEmbedding.isEmpty()) {
            log.info("Semantic embedding backfill skipped: no books missing embeddings");
            return;
        }

        log.info("Semantic embedding backfill started for {} books", booksWithoutEmbedding.size());
        int updatedCount = 0;
        for (Book book : booksWithoutEmbedding) {
            try {
                float[] embedding = semanticEmbeddingService.generateEmbedding(book.buildTextForEmbedding());
                String embeddingLiteral = semanticEmbeddingService.toVectorLiteral(embedding);
                bookSemanticRepository.updateEmbedding(book.getId(), embeddingLiteral);
                updatedCount++;
            } catch (Exception exception) {
                log.warn("Failed to backfill embedding for book id={} title={}", book.getId(), book.getTitle(), exception);
            }
        }

        log.info("Semantic embedding backfill completed. Updated {} books", updatedCount);
    }

    @Transactional
    public void backfillMissingFtsTokens() {
        List<Book> booksWithoutFtsTokens = bookSemanticRepository.findBooksWithoutFtsTokens();
        if (booksWithoutFtsTokens.isEmpty()) {
            log.info("Semantic FTS backfill skipped: no books missing FTS tokens");
            return;
        }

        log.info("Semantic FTS backfill started for {} books", booksWithoutFtsTokens.size());
        int updatedCount = 0;
        for (Book book : booksWithoutFtsTokens) {
            try {
                bookSemanticRepository.updateFtsTokens(book.getId());
                updatedCount++;
            } catch (Exception exception) {
                log.warn("Failed to backfill FTS tokens for book id={} title={}", book.getId(), book.getTitle(), exception);
            }
        }

        log.info("Semantic FTS backfill completed. Updated {} books", updatedCount);
    }

    @Transactional
    public void backfillAllMissingSemanticData() {
        backfillMissingEmbeddings();
        backfillMissingFtsTokens();
    }
}
