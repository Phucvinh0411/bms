package fit.iuh.semanticsearch;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/books")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:3001"})
public class SemanticSearchController {

    private final HybridSearchService hybridSearchService;

    public SemanticSearchController(HybridSearchService hybridSearchService) {
        this.hybridSearchService = hybridSearchService;
    }

    @GetMapping({"/semantic-search", "/hybrid-search"})
    public List<SemanticBookSearchDTO> semanticSearch(@RequestParam("query") String query,
                                                      @RequestParam(value = "limit", defaultValue = "10") int limit,
                                                      @RequestParam(value = "offset", defaultValue = "0") int offset,
                                                      @RequestParam(value = "categoryIdsCsv", required = false) String categoryIdsCsv,
                                                      @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
                                                      @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice) {
        return hybridSearchService.hybridSearch(query, limit, offset, categoryIdsCsv, minPrice, maxPrice);
    }
}
