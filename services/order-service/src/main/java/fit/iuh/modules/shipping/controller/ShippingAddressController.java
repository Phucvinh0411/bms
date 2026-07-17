package fit.iuh.modules.shipping.controller;

import fit.iuh.modules.shipping.dto.ShippingAddressRequest;
import fit.iuh.modules.shipping.dto.ShippingAddressResponse;
import fit.iuh.modules.shipping.service.ShippingAddressService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipping-addresses")
@RequiredArgsConstructor
public class ShippingAddressController {
    private final ShippingAddressService shippingAddressService;

    @PostMapping
    public ResponseEntity<ShippingAddressResponse> create(@RequestBody ShippingAddressRequest request) {
        return new ResponseEntity<>(shippingAddressService.create(request), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ShippingAddressResponse>> getByUser(@RequestParam Long userId) {
        return ResponseEntity.ok(shippingAddressService.getByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShippingAddressResponse> getById(@PathVariable Long id, @RequestParam Long userId) {
        return ResponseEntity.ok(shippingAddressService.getById(id, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShippingAddressResponse> update(
        @PathVariable Long id,
        @RequestBody ShippingAddressRequest request
    ) {
        return ResponseEntity.ok(shippingAddressService.update(id, request));
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<ShippingAddressResponse> setDefault(@PathVariable Long id, @RequestParam Long userId) {
        return ResponseEntity.ok(shippingAddressService.setDefault(id, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam Long userId) {
        shippingAddressService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
