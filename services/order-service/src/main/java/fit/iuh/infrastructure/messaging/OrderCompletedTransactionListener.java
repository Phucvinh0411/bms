package fit.iuh.infrastructure.messaging;

import fit.iuh.infrastructure.config.OrderReportExchangeConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCompletedTransactionListener {

    private final RabbitTemplate rabbitTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderCompletedAfterCommit(OrderCompletedEvent event) {
        log.info("DB Transaction COMMITTED successfully. Dispatching event to RabbitMQ for Order ID: {}", event.orderId());
        try {
            rabbitTemplate.convertAndSend(
                OrderReportExchangeConfig.EXCHANGE_NAME,
                OrderReportExchangeConfig.ROUTING_KEY,
                event
            );
            log.info("Successfully dispatched OrderCompletedEvent to exchange: {}", OrderReportExchangeConfig.EXCHANGE_NAME);
        } catch (Exception e) {
            log.error("FAILED to dispatch OrderCompletedEvent to RabbitMQ: {}", e.getMessage(), e);
        }
    }
}
