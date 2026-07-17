package fit.iuh.modules.shipping.controller;

import fit.iuh.modules.shipping.model.ShippingRule;
import fit.iuh.modules.shipping.repository.ShippingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping-rules")
@RequiredArgsConstructor
public class ShippingRuleController {

    private final ShippingRuleRepository shippingRuleRepository;

    @GetMapping
    public ResponseEntity<List<ShippingRule>> getAllRules() {
        return ResponseEntity.ok(shippingRuleRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<ShippingRule> createRule(@RequestBody ShippingRule rule) {
        return new ResponseEntity<>(shippingRuleRepository.save(rule), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShippingRule> updateRule(@PathVariable Long id, @RequestBody ShippingRule updatedRule) {
        return shippingRuleRepository.findById(id)
                .map(rule -> {
                    rule.setMinDistance(updatedRule.getMinDistance());
                    rule.setMaxDistance(updatedRule.getMaxDistance());
                    rule.setFee(updatedRule.getFee());
                    return ResponseEntity.ok(shippingRuleRepository.save(rule));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        if (shippingRuleRepository.existsById(id)) {
            shippingRuleRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
