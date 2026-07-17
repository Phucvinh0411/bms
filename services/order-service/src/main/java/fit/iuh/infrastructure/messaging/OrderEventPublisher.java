package fit.iuh.infrastructure.messaging;

import fit.iuh.domain.model.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public void publishOrderCompleted(Order order) {
        OrderCompletedEvent event = new OrderCompletedEvent(
            UUID.randomUUID().toString(),
            order.getId(),
            order.getUserId(),
            order.getTotalAmount(),
            order.getSubtotalAmount(),
            order.getBaseShippingFee(),
            order.getShippingDiscount(),
            order.getOrderDiscount(),
            order.getFinalTotal(),
            LocalDateTime.now(),
            order.getItems().stream()
                .map(item -> new OrderCompletedEvent.OrderItemDto(
                    item.getBookId(),
                    item.getQuantity(),
                    item.getPriceAtPurchase()
                )).collect(Collectors.toList())
        );
        
        log.info("Publishing internal transactional application event for Order ID: {}", order.getId());
        applicationEventPublisher.publishEvent(event);
    }
}
