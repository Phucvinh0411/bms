package fit.iuh.order.module.order_management.controller;

import fit.iuh.order.module.dto.ApiResponse;
import fit.iuh.order.module.models.Order;
import fit.iuh.order.module.models.PaymentTransaction;
import fit.iuh.order.module.models.enums.OrderStatus;
import fit.iuh.order.module.models.enums.PaymentStatus;
import fit.iuh.order.module.order_management.repository.OrderRepository;
import fit.iuh.order.module.repository.PaymentTransactionRepository;
import fit.iuh.order.module.state.PendingState;
import fit.iuh.order.module.strategy.PayOSPaymentStrategy;
import fit.iuh.order.module.messaging.OrderMessageProducer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller Quản lý Thanh toán & Webhook & Server-Sent Events (SSE)
 * Cung cấp API tạo link thanh toán VietQR PayOS, đón Webhook thời gian thực từ Ngrok
 * và thiết lập kết nối SSE đẩy kết quả thanh toán trực tiếp xuống màn hình Next.js.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PayOSPaymentStrategy payOSPaymentStrategy;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OrderMessageProducer orderMessageProducer;

    // Lưu trữ các kết nối SSE của khách hàng theo Order ID
    private final ConcurrentHashMap<Long, SseEmitter> sseEmitters = new ConcurrentHashMap<>();

    public PaymentController(
            PayOSPaymentStrategy payOSPaymentStrategy,
            OrderRepository orderRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            OrderMessageProducer orderMessageProducer
    ) {
        this.payOSPaymentStrategy = payOSPaymentStrategy;
        this.orderRepository = orderRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.orderMessageProducer = orderMessageProducer;
    }

    /**
     * API Tạo Link Thanh Toán PayOS cho đơn hàng hiện tại
     * POST /api/payments/payos/create/{orderId}
     */
    @PostMapping("/payos/create/{orderId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createPayOSPayment(
            @PathVariable Long orderId,
            @RequestParam String returnUrl,
            @RequestParam String cancelUrl
    ) {
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

            // Gọi Strategy để tạo link thanh toán từ PayOS
            Map<String, Object> paymentData = payOSPaymentStrategy.createPaymentLink(order, returnUrl, cancelUrl);

            // Lưu trữ hoặc cập nhật Payment Transaction ở trạng thái UNPAID
            PaymentTransaction transaction = paymentTransactionRepository.findById(orderId)
                    .orElse(new PaymentTransaction());
            transaction.setId(orderId);
            transaction.setOrderId(orderId);
            transaction.setAmount(order.getFinalTotal());
            transaction.setStatus(PaymentStatus.UNPAID);
            paymentTransactionRepository.save(transaction);

            return ResponseEntity.ok(new ApiResponse<>("Tạo link thanh toán PayOS VietQR thành công", paymentData));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("Lỗi tạo link thanh toán: " + e.getMessage(), null));
        }
    }

    /**
     * Endpoint tiếp nhận Webhook thực tế từ PayOS
     * POST /api/payments/payos/webhook
     * Link này được đăng ký thông qua Ngrok public URL
     */
    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<String>> receivePayOSWebhook(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("Nhận Webhook từ PayOS: " + payload);

            String responseCode = (String) payload.get("code");
            String signature = (String) payload.get("signature");
            Map<String, Object> data = (Map<String, Object>) payload.get("data");

            if (data == null || signature == null) {
                return ResponseEntity.badRequest().body(new ApiResponse<>("Dữ liệu Webhook không hợp lệ", null));
            }

            // 1. Xác thực chữ ký để chống gian lận tài chính
            boolean isValid = payOSPaymentStrategy.verifyWebhookSignature(data, signature);
            if (!isValid) {
                System.err.println("CẢNH BÁO: Chữ ký Webhook PayOS không hợp lệ! Khả năng bị giả mạo request.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ApiResponse<>("Chữ ký không hợp lệ", null));
            }

            // 2. Kiểm tra mã phản hồi thành công từ PayOS ("00" là thành công)
            if ("00".equals(responseCode)) {
                // Lấy mã đơn hàng từ trường orderCode (PayOS gửi về kiểu số nguyên)
                Number orderCodeNum = (Number) data.get("orderCode");
                Long orderId = orderCodeNum.longValue();

                Order order = orderRepository.findById(orderId).orElse(null);
                if (order != null) {
                    System.out.println("Xác thực thanh toán đơn hàng #" + orderId + " thành công!");

                    // Cập nhật trạng thái đơn hàng sang CONFIRMED qua State Pattern
                    // Khi đơn hàng ở trạng thái PENDING, process() sẽ chuyển sang CONFIRMED
                    if (order.getStatus() == OrderStatus.PENDING) {
                        order.changeState(new PendingState());
                        orderRepository.save(order);
                    }

                    // Cập nhật Payment Transaction sang trạng thái PAID
                    PaymentTransaction transaction = paymentTransactionRepository.findById(orderId).orElse(null);
                    if (transaction != null) {
                        transaction.setStatus(PaymentStatus.PAID);
                        paymentTransactionRepository.save(transaction);
                    }

                    // 3. Publish sự kiện PaymentSettledEvent vào RabbitMQ để đồng bộ microservices
                    orderMessageProducer.publishPaymentSettledEvent(orderId, "PAID");

                    // 4. Đẩy tín hiệu thời gian thực xuống Client thông qua Server-Sent Events (SSE)
                    sendSseNotification(orderId, "PAID");
                }
            }

            // PayOS yêu cầu trả về status success cùng HTTP 200 để xác nhận đã xử lý thành công
            return ResponseEntity.ok(new ApiResponse<>("Webhook xử lý thành công", "success"));
        } catch (Exception e) {
            System.err.println("Lỗi xử lý Webhook: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("Lỗi xử lý Webhook: " + e.getMessage(), null));
        }
    }

    /**
     * Endpoint kết nối Server-Sent Events (SSE) để Client lắng nghe kết quả thanh toán
     * GET /api/payments/sse/{orderId}
     */
    @GetMapping(value = "/sse/{orderId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribePaymentSse(@PathVariable Long orderId) {
        // Hết hạn kết nối sau 5 phút (300,000 miligiây)
        SseEmitter emitter = new SseEmitter(300_000L);
        
        this.sseEmitters.put(orderId, emitter);

        emitter.onCompletion(() -> this.sseEmitters.remove(orderId));
        emitter.onTimeout(() -> {
            emitter.complete();
            this.sseEmitters.remove(orderId);
        });
        emitter.onError((ex) -> this.sseEmitters.remove(orderId));

        try {
            // Gửi event khởi tạo kết nối đầu tiên
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Kết nối thành công! Đang chờ thanh toán đơn hàng #" + orderId));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * Gửi thông báo SSE tới Client đăng ký theo Order ID
     */
    private void sendSseNotification(Long orderId, String status) {
        SseEmitter emitter = this.sseEmitters.get(orderId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PAYMENT_STATUS")
                        .data(Map.of("orderId", orderId, "status", status)));
                emitter.complete(); // Đóng kết nối sau khi đã hoàn tất thanh toán
                this.sseEmitters.remove(orderId);
            } catch (IOException e) {
                emitter.completeWithError(e);
                this.sseEmitters.remove(orderId);
            }
        }
    }
}
