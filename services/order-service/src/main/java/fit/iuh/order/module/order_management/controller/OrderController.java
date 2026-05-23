package fit.iuh.order.module.order_management.controller;

import fit.iuh.order.module.order_management.dto.OrderPreviewResponse;
import fit.iuh.order.module.order_management.dto.OrderRequest;
import fit.iuh.order.module.order_management.dto.OrderResponse;
import fit.iuh.order.module.order_management.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("orderManagementOrderController")
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        return new ResponseEntity<>(orderService.createOrder(request), HttpStatus.CREATED);
    }

    @PostMapping("/preview")
    public ResponseEntity<OrderPreviewResponse> previewOrder(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.previewOrder(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @GetMapping("/check-purchase")
    public ResponseEntity<Boolean> checkPurchase(@RequestParam Long userId, @RequestParam Long bookId) {
        boolean hasPurchased = orderService.checkPurchase(userId, bookId);
        return ResponseEntity.ok(hasPurchased);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
