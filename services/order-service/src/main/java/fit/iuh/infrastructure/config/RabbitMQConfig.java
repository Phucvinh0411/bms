package fit.iuh.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình RabbitMQ cho Order Service
 * Khai báo các Exchange, Queue và Binding để xử lý bất đồng bộ kết quả thanh toán.
 */
@Configuration
public class RabbitMQConfig {

    public static final String QUEUE_NAME = "payment-settled-queue";
    public static final String EXCHANGE_NAME = "payment-settled-exchange";
    public static final String ROUTING_KEY = "payment.settled";

    @Bean
    public Queue paymentSettledQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Bean
    public TopicExchange paymentSettledExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Binding paymentSettledBinding(
            @org.springframework.beans.factory.annotation.Qualifier("paymentSettledQueue") Queue queue, 
            @org.springframework.beans.factory.annotation.Qualifier("paymentSettledExchange") TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
        objectMapper.findAndRegisterModules();
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
