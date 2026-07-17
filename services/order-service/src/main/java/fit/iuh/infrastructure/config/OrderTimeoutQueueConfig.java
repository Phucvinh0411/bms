package fit.iuh.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * Cấu hình RabbitMQ cho tính năng tự động hủy đơn hàng quá hạn thanh toán (Payment Timeout)
 * Sử dụng cơ chế gốc: TTL (Time-To-Live) kết hợp Dead Letter Exchange (DLX) mà không cần cài thêm plugin.
 */
@Configuration
public class OrderTimeoutQueueConfig {

    public static final String TTL_QUEUE_NAME = "order-timeout-ttl-queue";
    public static final String DLX_EXCHANGE_NAME = "order-timeout-dlx-exchange";
    public static final String DLX_QUEUE_NAME = "order-timeout-dlx-queue";
    public static final String DLX_ROUTING_KEY = "order.timeout";

    // 1. Tạo TTL Queue - Tin nhắn gửi vào đây sẽ chờ 15 phút (900,000 ms) rồi tự hết hạn
    @Bean
    public Queue orderTimeoutTtlQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", 900000); // 15 phút
        args.put("x-dead-letter-exchange", DLX_EXCHANGE_NAME);
        args.put("x-dead-letter-routing-key", DLX_ROUTING_KEY);
        return QueueBuilder.durable(TTL_QUEUE_NAME)
                .withArguments(args)
                .build();
    }

    // 2. Tạo Dead Letter Exchange (DLX)
    @Bean
    public TopicExchange orderTimeoutDlxExchange() {
        return new TopicExchange(DLX_EXCHANGE_NAME);
    }

    // 3. Tạo Dead Letter Queue (Nơi Consumer thực sự lắng nghe tin nhắn đã hết hạn)
    @Bean
    public Queue orderTimeoutDlxQueue() {
        return QueueBuilder.durable(DLX_QUEUE_NAME).build();
    }

    // 4. Liên kết DLQ với DLX
    @Bean
    public Binding orderTimeoutDlxBinding() {
        return BindingBuilder.bind(orderTimeoutDlxQueue())
                .to(orderTimeoutDlxExchange())
                .with(DLX_ROUTING_KEY);
    }
}
