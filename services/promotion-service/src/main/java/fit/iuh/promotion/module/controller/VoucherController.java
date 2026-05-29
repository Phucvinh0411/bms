package fit.iuh.promotion.module.controller;

import fit.iuh.promotion.module.domain.Voucher;
import fit.iuh.promotion.module.dto.VoucherResponseDTO;
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

    @GetMapping("/code/{code}")
    public ResponseEntity<VoucherResponseDTO> getByCode(@PathVariable String code) {
        return voucherService.getByCode(code)
                .map(this::convertToDTO)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Voucher> create(@RequestBody Voucher voucher) {
        return ResponseEntity.status(HttpStatus.CREATED).body(voucherService.create(voucher));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Voucher> update(@PathVariable Long id, @RequestBody Voucher voucher) {
        return voucherService.update(id, voucher)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (voucherService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/ask-ai")
    public ResponseEntity<String> askAI(@RequestBody String message) {
        if (assistant == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("AI assistant is not configured. Please set a chat language model for promotion-service.");
        }
        return ResponseEntity.ok(assistant.suggestVoucher(message));
    }

    private VoucherResponseDTO convertToDTO(Voucher voucher) {
        VoucherResponseDTO dto = new VoucherResponseDTO();
        dto.setId(voucher.getId());
        dto.setCode(voucher.getCode());
        dto.setSummary(voucher.getCode() + ": " + voucher.getDescription());
        dto.setDiscountType(voucher.getDiscountType());
        dto.setDiscountValue(voucher.getDiscountAmount());
        dto.setMinimumOrderValue(voucher.getMinOrderValue());
        dto.setMaxDiscountAmount(voucher.getMaxDiscountAmount());
        dto.setStartDate(voucher.getStartDate());
        dto.setEndDate(voucher.getEndDate());
        dto.setStatus(voucher.getStatus());
        dto.setDescription(voucher.getDescription());
        return dto;
    }
}
