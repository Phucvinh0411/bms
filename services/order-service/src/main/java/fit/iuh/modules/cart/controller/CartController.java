package fit.iuh.modules.cart.controller;

import fit.iuh.modules.cart.dto.AddCartItemRequest;
import fit.iuh.modules.order.dto.ApiResponse;
import fit.iuh.modules.cart.dto.CartResponse;
import fit.iuh.modules.cart.dto.RemoveCartItemRequest;
import fit.iuh.modules.cart.dto.UpdateCartItemQuantityRequest;
import fit.iuh.modules.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    @PostMapping("/items/add")
    public ResponseEntity<ApiResponse<CartResponse>> addProduct(@Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Add product to cart successfully", cartService.addProduct(request)));
    }

    @PostMapping("/items/remove")
    public ResponseEntity<ApiResponse<CartResponse>> removeProduct(@Valid @RequestBody RemoveCartItemRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Remove product from cart successfully", cartService.removeProduct(request)));
    }

    @PostMapping("/items/update-quantity")
    public ResponseEntity<ApiResponse<CartResponse>> updateProductQuantity(@Valid @RequestBody UpdateCartItemQuantityRequest request) {
        return ResponseEntity.ok(new ApiResponse<>("Update product quantity successfully", cartService.updateProductQuantity(request)));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<CartResponse>> getCartByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(new ApiResponse<>("Get cart successfully", cartService.getCartByUserId(userId)));
    }
}
