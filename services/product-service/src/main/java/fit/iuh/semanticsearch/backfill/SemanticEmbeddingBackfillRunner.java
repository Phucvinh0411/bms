package fit.iuh.semanticsearch.backfill;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class SemanticEmbeddingBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SemanticEmbeddingBackfillRunner.class);

    private final SemanticEmbeddingBackfillService backfillService;

    public SemanticEmbeddingBackfillRunner(SemanticEmbeddingBackfillService backfillService) {
        this.backfillService = backfillService;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            backfillService.backfillAllMissingSemanticData();
        } catch (Exception exception) {
            log.warn("Semantic embedding backfill failed on startup", exception);
        }
    }
}
