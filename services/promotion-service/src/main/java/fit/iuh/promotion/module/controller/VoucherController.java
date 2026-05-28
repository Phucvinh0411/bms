package fit.iuh.promotion.module.controller;

import fit.iuh.promotion.module.domain.Voucher;
import fit.iuh.promotion.module.service.VoucherAssistant;
import fit.iuh.promotion.module.service.VoucherService; // Cần thiết!
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired; // Cực kỳ quan trọng!
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
public class VoucherController {

    @Autowired
    private VoucherService voucherService;
    
    @Autowired(required = false)
    private VoucherAssistant assistant;

    @GetMapping
    public ResponseEntity<List<Voucher>> getAll() {
        return ResponseEntity.ok(voucherService.getAll());
    }

    @PostMapping
    public ResponseEntity<Voucher> create(@RequestBody Voucher voucher) {
        return ResponseEntity.status(HttpStatus.CREATED).body(voucherService.create(voucher));
    }

    @PostMapping("/ask-ai")
    public ResponseEntity<String> askAI(@RequestBody String message) {
        if (assistant == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("AI assistant is not configured. Please set a chat language model for promotion-service.");
        }
        return ResponseEntity.ok(assistant.suggestVoucher(message));
    }
}
