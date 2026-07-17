package fit.iuh.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OrderReportExchangeConfig {

    public static final String EXCHANGE_NAME = "order.events.exchange";
    public static final String QUEUE_NAME = "report.order-completed.queue";
    public static final String ROUTING_KEY = "order.completed";

    @Bean
    public TopicExchange orderReportEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE_NAME)
                .durable(true)
                .build();
    }

    @Bean
    public Queue reportOrderCompletedQueue() {
        return QueueBuilder.durable(QUEUE_NAME)
                .build();
    }

    @Bean
    public Binding bindingReportOrderCompleted() {
        return BindingBuilder.bind(reportOrderCompletedQueue())
                .to(orderReportEventsExchange())
                .with(ROUTING_KEY);
    }
}
