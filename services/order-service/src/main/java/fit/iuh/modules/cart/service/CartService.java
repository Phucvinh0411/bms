package fit.iuh.modules.cart.service;

import fit.iuh.modules.cart.dto.AddCartItemRequest;
import fit.iuh.modules.cart.dto.CartItemResponse;
import fit.iuh.modules.cart.dto.CartResponse;
import fit.iuh.modules.cart.dto.RemoveCartItemRequest;
import fit.iuh.modules.cart.dto.UpdateCartItemQuantityRequest;
import fit.iuh.modules.cart.model.RedisCart;
import fit.iuh.modules.cart.model.RedisCartItem;
import fit.iuh.modules.cart.repository.CartRedisRepository;
import fit.iuh.domain.exception.BadRequestException;
import fit.iuh.domain.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {
    private final CartRedisRepository cartRedisRepository;

    public CartResponse addProduct(AddCartItemRequest request) {
        RedisCart cart = cartRedisRepository.getCart(request.userId());
        
        Optional<RedisCartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getBookId().equals(request.bookId()))
                .findFirst();

        if (existingItem.isPresent()) {
            existingItem.get().setQuantity(existingItem.get().getQuantity() + request.quantity());
        } else {
            cart.getItems().add(RedisCartItem.builder()
                    .bookId(request.bookId())
                    .quantity(request.quantity())
                    .build());
        }

        cartRedisRepository.saveCart(cart);
        return toResponse(cart);
    }

    public CartResponse removeProduct(RemoveCartItemRequest request) {
        RedisCart cart = cartRedisRepository.getCart(request.userId());

        RedisCartItem item = cart.getItems().stream()
                .filter(i -> i.getBookId().equals(request.bookId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Book not found in cart: bookId=" + request.bookId()));

        if (request.quantity() > item.getQuantity()) {
            throw new BadRequestException("remove quantity exceeds existing quantity");
        }

        int remaining = item.getQuantity() - request.quantity();
        if (remaining <= 0) {
            cart.getItems().remove(item);
        } else {
            item.setQuantity(remaining);
        }

        cartRedisRepository.saveCart(cart);
        return toResponse(cart);
    }

    public CartResponse updateProductQuantity(UpdateCartItemQuantityRequest request) {
        RedisCart cart = cartRedisRepository.getCart(request.userId());

        RedisCartItem item = cart.getItems().stream()
                .filter(i -> i.getBookId().equals(request.bookId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Book not found in cart: bookId=" + request.bookId()));

        item.setQuantity(request.quantity());
        cartRedisRepository.saveCart(cart);

        return toResponse(cart);
    }

    public CartResponse getCartByUserId(Long userId) {
        RedisCart cart = cartRedisRepository.getCart(userId);
        return toResponse(cart);
    }

    private CartResponse toResponse(RedisCart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .map(item -> new CartItemResponse(
                        item.getBookId(), // id of item mapped to bookId
                        cart.getUserId(), // cartId mapped to userId
                        item.getBookId(),
                        item.getQuantity()
                ))
                .toList();

        return new CartResponse(
                cart.getUserId(), // id of cart mapped to userId
                cart.getUserId(),
                BigDecimal.ZERO,
                items
        );
    }
}
