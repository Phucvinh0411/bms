package fit.iuh.modules.order.controller;

import fit.iuh.modules.order.dto.OrderPreviewResponse;
import fit.iuh.modules.order.dto.OrderRequest;
import fit.iuh.modules.order.dto.OrderResponse;
import fit.iuh.modules.order.service.OrderService;
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

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private fit.iuh.infrastructure.cron.PaymentReconciliationScheduler paymentReconciliationScheduler;

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

    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancelOrder(id));
    }

    @PutMapping("/{id}/payment-method")
    public ResponseEntity<OrderResponse> changePaymentMethod(
            @PathVariable Long id,
            @RequestParam String paymentMethod,
            @RequestParam(required = false) String returnUrl,
            @RequestParam(required = false) String cancelUrl) {
        return ResponseEntity.ok(orderService.changePaymentMethod(id, paymentMethod, returnUrl, cancelUrl));
    }

    @PostMapping("/reconcile-test")
    public ResponseEntity<String> triggerReconciliationTest() {
        if (paymentReconciliationScheduler != null) {
            paymentReconciliationScheduler.reconcilePayments();
            return ResponseEntity.ok("Payment reconciliation triggered successfully!");
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Scheduler not available");
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<OrderResponse> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmOrder(id));
    }

    @PutMapping("/{id}/shipping-fee")
    public ResponseEntity<OrderResponse> updateShippingFee(
            @PathVariable Long id,
            @RequestParam java.math.BigDecimal shippingFee) {
        return ResponseEntity.ok(orderService.updateShippingFee(id, shippingFee));
    }
}
