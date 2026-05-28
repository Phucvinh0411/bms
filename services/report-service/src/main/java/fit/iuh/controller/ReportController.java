package fit.iuh.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return Map.of(
            "service", "report-service",
            "status", "READY",
            "generatedAt", Instant.now().toString(),
            "message", "Report service is reachable from admin"
        );
    }
}
