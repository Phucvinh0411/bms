package fit.iuh.modules.checkout.handler;

import fit.iuh.modules.checkout.model.CheckoutContext;
import fit.iuh.modules.cart.repository.CartRedisRepository;
import fit.iuh.modules.cart.model.RedisCart;
import fit.iuh.modules.cart.model.RedisCartItem;
import fit.iuh.domain.exception.BadRequestException;
import fit.iuh.domain.exception.NotFoundException;
import fit.iuh.modules.order.dto.OrderItemRequest;
import fit.iuh.modules.order.dto.external.BookResponseDTO;
import fit.iuh.domain.model.OrderItem;
import io.github.resilience4j.retry.annotation.Retry;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
@RequiredArgsConstructor
public class StockCheckHandler extends CheckoutHandler {
    private final CartRedisRepository cartRedisRepository;
    private final RestTemplate restTemplate;

    @Value("${external.product-service.base-url:http://product-service:8082}")
    private String productServiceBaseUrl;

    @Override
    @Retry(name = "backendCallRetry", fallbackMethod = "fallbackStockCheck")
    public void handle(CheckoutContext context) {
        log.info("Starting stock check execution for user: {}", context.getUserId());
        process(context);
        handleNext(context);
    }

    @Override
    protected void process(CheckoutContext context) {
        List<OrderItemRequest> requestedItems = context.getRequestedItems();
        List<OrderItemRequest> itemRequests = new ArrayList<>();

        if (requestedItems != null && !requestedItems.isEmpty()) {
            itemRequests.addAll(requestedItems);
        } else {
            RedisCart cart = cartRedisRepository.getCart(context.getUserId());
            if (cart.getItems() == null || cart.getItems().isEmpty()) {
                throw new BadRequestException("Cart is empty");
            }
            context.setCartId(cart.getUserId()); // Set cart ID to userId for identification
            for (RedisCartItem item : cart.getItems()) {
                itemRequests.add(new OrderItemRequest(item.getBookId(), item.getQuantity()));
            }
        }

        // Batch fetch all books at once to avoid N+1 REST calls (Senior Dev Practice)
        List<Long> bookIds = itemRequests.stream()
            .map(OrderItemRequest::getBookId)
            .distinct()
            .toList();

        Map<Long, BookResponseDTO> bookMap = Map.of();
        if (!bookIds.isEmpty()) {
            try {
                BookResponseDTO[] booksArray = restTemplate.postForObject(
                    productServiceBaseUrl + "/api/books/batch",
                    bookIds,
                    BookResponseDTO[].class
                );
                if (booksArray != null) {
                    bookMap = List.of(booksArray).stream()
                        .collect(Collectors.toMap(BookResponseDTO::getId, book -> book));
                }
            } catch (Exception e) {
                log.error("Failed to fetch books in batch, falling back to individual calls: {}", e.getMessage());
                // Fallback to fetch one-by-one if batch endpoint fails for some reason
                bookMap = new java.util.HashMap<>();
                for (Long id : bookIds) {
                    try {
                        BookResponseDTO book = restTemplate.getForObject(
                            productServiceBaseUrl + "/api/books/" + id,
                            BookResponseDTO.class
                        );
                        if (book != null) {
                            bookMap.put(id, book);
                        }
                    } catch (Exception singleEx) {
                        log.warn("Failed to fetch book id {}: {}", id, singleEx.getMessage());
                    }
                }
            }
        }

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : itemRequests) {
            if (itemRequest.getQuantity() <= 0) {
                throw new BadRequestException(
                    "Quantity must be greater than 0 for bookId: " + itemRequest.getBookId()
                );
            }

            BookResponseDTO book = bookMap.get(itemRequest.getBookId());

            if (book == null) {
                throw new NotFoundException("Book not found with id: " + itemRequest.getBookId());
            }
            if (book.getStockQuantity() < itemRequest.getQuantity()) {
                throw new BadRequestException(
                    "Insufficient stock for bookId: " + itemRequest.getBookId()
                );
            }

            OrderItem orderItem = OrderItem.builder()
                .bookId(itemRequest.getBookId())
                .quantity(itemRequest.getQuantity())
                .priceAtPurchase(book.getPrice())
                .build();
            orderItems.add(orderItem);

            BigDecimal lineTotal = book.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            subtotal = subtotal.add(lineTotal);
        }

        context.setOrderItems(orderItems);
        context.setSubtotal(subtotal);
    }

    public void fallbackStockCheck(CheckoutContext context, Exception ex) {
        log.error("All retry attempts failed to call product-service in StockCheckHandler. Error: {}. Marking stock as failed but allowed to bypass.", ex.getMessage(), ex);
        context.setMetadata("STOCK_CHECK_STATUS", "FAILED_BUT_ALLOWED");
        handleNext(context);
    }
}
