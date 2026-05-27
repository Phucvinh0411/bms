package fit.iuh.order.module.messaging;

import java.io.Serializable;

/**
 * Sự kiện thanh toán thành công (PaymentSettledEvent)
 * Dùng để publish vào RabbitMQ nhằm đồng bộ và thông báo cho các Microservices khác
 * cũng như kích hoạt Server-Sent Events (SSE) đẩy tín hiệu thời gian thực xuống Client.
 */
public class PaymentSettledEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long orderId;
    private String status;

    public PaymentSettledEvent() {
    }

    public PaymentSettledEvent(Long orderId, String status) {
        this.orderId = orderId;
        this.status = status;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "PaymentSettledEvent{" +
                "orderId=" + orderId +
                ", status='" + status + '\'' +
                '}';
    }
}
