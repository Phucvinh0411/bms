package fit.iuh.order.module.strategy;

import fit.iuh.order.module.models.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * PayOS VietQR Payment Strategy Implementation
 * Hiện thực hóa chiến lược thanh toán qua PayOS VietQR Live Mode.
 * Tự động tính toán chữ ký HMAC-SHA256, gọi API tạo link thanh toán
 * và cung cấp hàm kiểm tra tính toàn vẹn của webhook signature.
 */
@Component("payOSPaymentStrategy")
public class PayOSPaymentStrategy implements PaymentStrategy {

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    private final WebClient webClient;

    public PayOSPaymentStrategy() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api-merchant.payos.vn")
                .build();
    }

    @Override
    public void pay(BigDecimal amount) {
        // Hỗ trợ giao diện gốc của PaymentStrategy (gọi cho các giao dịch nội bộ)
        System.out.println("Executing generic payment via PayOS of amount: " + amount);
    }

    /**
     * Tạo Link Thanh Toán PayOS VietQR
     * Gửi yêu cầu HTTP POST sang PayOS API v2/payment-requests để lấy checkoutUrl.
     *
     * @param order Đối tượng đơn hàng cần thanh toán
     * @param returnUrl URL redirect khi người dùng thanh toán thành công
     * @param cancelUrl URL redirect khi người dùng hủy bỏ thanh toán
     * @return Map chứa dữ liệu trả về từ PayOS (bao gồm checkoutUrl, qrCode, v.v.)
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> createPaymentLink(Order order, String returnUrl, String cancelUrl) throws Exception {
        long orderCode = order.getId();
        int amount = order.getFinalTotal().intValue();
        
        // Mô tả giao dịch (tối đa 25 ký tự theo tài liệu PayOS để tránh lỗi)
        String description = "Thanh toan don hang #" + orderCode;
        if (description.length() > 25) {
            description = "BMS Don#" + orderCode;
        }

        // 1. Sắp xếp các tham số alphabet để tính chữ ký (Signature) cho request theo chuẩn tài liệu PayOS
        Map<String, Object> paramsToSign = new TreeMap<>();
        paramsToSign.put("amount", amount);
        paramsToSign.put("cancelUrl", cancelUrl);
        paramsToSign.put("description", description);
        paramsToSign.put("orderCode", orderCode);
        paramsToSign.put("returnUrl", returnUrl);

        StringBuilder signatureString = new StringBuilder();
        for (Map.Entry<String, Object> entry : paramsToSign.entrySet()) {
            if (signatureString.length() > 0) {
                signatureString.append("&");
            }
            signatureString.append(entry.getKey()).append("=").append(entry.getValue());
        }

        // Tính HMAC-SHA256 với checksumKey
        String signature = calculateHmacSHA256(signatureString.toString(), checksumKey);

        // 2. Tạo Body Request
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("orderCode", orderCode);
        requestBody.put("amount", amount);
        requestBody.put("description", description);
        requestBody.put("cancelUrl", cancelUrl);
        requestBody.put("returnUrl", returnUrl);
        requestBody.put("signature", signature);

        // 3. Gọi HTTP POST tới cổng thanh toán PayOS
        Map<String, Object> response = webClient.post()
                .uri("/v2/payment-requests")
                .header("x-client-id", clientId)
                .header("x-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response != null && "00".equals(response.get("code"))) {
            return (Map<String, Object>) response.get("data");
        } else {
            String errorMsg = response != null ? (String) response.get("desc") : "Không có phản hồi từ PayOS";
            throw new RuntimeException("Tạo link thanh toán PayOS thất bại: " + errorMsg);
        }
    }

    /**
     * Xác Thực Chữ Ký Webhook Từ PayOS đổ về qua link Ngrok
     * Sắp xếp alphabet các thuộc tính trong block 'data' nhận được để tính toán lại signature.
     * So sánh signature tính toán với signature nhận được để ngăn chặn gian lận tài chính.
     *
     * @param data Block dữ liệu 'data' chứa kết quả giao dịch từ PayOS
     * @param signature Chữ ký đính kèm trong payload Webhook nhận được
     * @return true nếu chữ ký hợp lệ, ngược lại false
     */
    public boolean verifyWebhookSignature(Map<String, Object> data, String signature) {
        try {
            Map<String, Object> sortedParams = new TreeMap<>(data);
            StringBuilder signatureString = new StringBuilder();
            for (Map.Entry<String, Object> entry : sortedParams.entrySet()) {
                if (entry.getValue() == null) continue;
                if (signatureString.length() > 0) {
                    signatureString.append("&");
                }
                signatureString.append(entry.getKey()).append("=").append(entry.getValue());
            }

            String calculatedSig = calculateHmacSHA256(signatureString.toString(), checksumKey);
            return calculatedSig.equalsIgnoreCase(signature);
        } catch (Exception e) {
            System.err.println("Lỗi trong quá trình xác thực chữ ký Webhook PayOS: " + e.getMessage());
            return false;
        }
    }

    /**
     * Thuật toán băm HMAC-SHA256 chuẩn
     */
    private String calculateHmacSHA256(String data, String key) throws Exception {
        Mac sha256HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256HMAC.init(secretKey);
        byte[] hash = sha256HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
