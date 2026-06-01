package fit.iuh.messaging;

import com.rabbitmq.client.Channel;
import fit.iuh.dto.OrderCompletedEvent;
import fit.iuh.model.ReportOrder;
import fit.iuh.model.ReportOrderItem;
import fit.iuh.repository.ReportOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class OrderCompletedListener {

    private final ReportOrderRepository reportOrderRepository;

    @RabbitListener(queues = "report.order-completed.queue", ackMode = "MANUAL")
    public void consumeOrderCompletedEvent(
            OrderCompletedEvent event, 
            Channel channel, 
            @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        
        log.info("Received OrderCompletedEvent from RabbitMQ: Order ID #{}", event.orderId());
        
        try {
            // Check for idempotency
            if (reportOrderRepository.existsById(event.orderId())) {
                log.info("Order ID #{} already exists in report_orders database, skipping duplication.", event.orderId());
                channel.basicAck(tag, false);
                return;
            }

            ReportOrder reportOrder = ReportOrder.builder()
                    .orderId(event.orderId())
                    .userId(event.userId())
                    .totalAmount(event.totalAmount())
                    .finalTotal(event.finalTotal())
                    .completedAt(event.completedAt() != null ? event.completedAt() : LocalDateTime.now())
                    .build();

            List<ReportOrderItem> items = event.items().stream()
                    .map(itemDto -> ReportOrderItem.builder()
                            .reportOrder(reportOrder)
                            .bookId(itemDto.bookId())
                            .quantity(itemDto.quantity())
                            .priceAtPurchase(itemDto.priceAtPurchase())
                            .build())
                    .toList();

            reportOrder.setItems(items);
            reportOrderRepository.save(reportOrder);
            log.info("Successfully saved processed report order ID #{} with {} items", event.orderId(), items.size());
            
            // Xác nhận xử lý thành công (ACK) để RabbitMQ xóa tin nhắn khỏi hàng đợi
            channel.basicAck(tag, false);
            log.info("Successfully processed and ACKed message tag: {}", tag);

        } catch (Exception e) {
            log.error("Failed to process OrderCompletedEvent for Order #{}. Rejecting message.", event.orderId(), e);
            
            // Reject message và gửi đến DLX (hoặc drop nếu requeue = false)
            channel.basicReject(tag, false);
        }
    }
}
