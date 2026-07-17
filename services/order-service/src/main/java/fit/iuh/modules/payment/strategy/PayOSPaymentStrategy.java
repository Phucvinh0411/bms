package fit.iuh.modules.payment.strategy;

import fit.iuh.domain.model.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

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
@Slf4j
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
        log.info("Executing generic payment via PayOS of amount: {}", amount);
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

        // 0. Cố gắng lấy link thanh toán đã tồn tại và còn hiệu lực từ PayOS trước để tránh lỗi trùng lặp orderCode và giữ nguyên 1 giao dịch
        try {
            log.info("PayOS: Checking if an active payment link already exists for Order #{}", orderCode);
            Map<String, Object> getResponse = webClient.get()
                    .uri("/v2/payment-requests/" + orderCode)
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            log.debug("PayOS GET raw response: {}", getResponse);
            if (getResponse != null && "00".equals(getResponse.get("code"))) {
                Map<String, Object> data = (Map<String, Object>) getResponse.get("data");
                if (data != null) {
                    log.debug("PayOS GET data fields: {}", data);
                    if ("PENDING".equalsIgnoreCase((String) data.get("status"))) {
                        // PayOS GET API chỉ trả về ID giao dịch ('id') chứ không trả về 'checkoutUrl'
                        // Cần tự động reconstruct checkoutUrl từ 'id' để frontend có thể chuyển hướng quét mã QR
                        String checkoutUrl = (String) data.get("checkoutUrl");
                        if (checkoutUrl == null || checkoutUrl.isEmpty()) {
                            String paymentLinkId = (String) data.get("id");
                            if (paymentLinkId != null && !paymentLinkId.isEmpty()) {
                                checkoutUrl = "https://pay.payos.vn/web/" + paymentLinkId;
                                Map<String, Object> mutableData = new java.util.HashMap<>(data);
                                mutableData.put("checkoutUrl", checkoutUrl);
                                log.info("PayOS: Found existing active payment link for Order #{}, reconstructed checkoutUrl = {}", orderCode, checkoutUrl);
                                return mutableData;
                            }
                        }
                        log.info("PayOS: Found existing active payment link for Order #{}, reusing it. checkoutUrl = {}", orderCode, checkoutUrl);
                        return data;
                    }
                }
            }
        } catch (Exception e) {
            log.info("PayOS: No existing active payment request found for Order #{} or failed to fetch, generating a new one. Details: {}", orderCode, e.getMessage());
        }
        
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
                if (entry.getValue() == null || entry.getValue().toString().trim().isEmpty()) continue;
                if (signatureString.length() > 0) {
                    signatureString.append("&");
                }
                signatureString.append(entry.getKey()).append("=").append(entry.getValue());
            }

            String calculatedSig = calculateHmacSHA256(signatureString.toString(), checksumKey);
            log.info("PayOS Webhook Sig Verification - Calculated: {} | Received: {}", calculatedSig, signature);
            return calculatedSig.equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Lỗi trong quá trình xác thực chữ ký Webhook PayOS: {}", e.getMessage(), e);
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

    @Override
    @SuppressWarnings("unchecked")
    public String verifyPaymentStatus(String orderId) {
        try {
            log.info("PayOS: Verifying payment status for Order ID: {}", orderId);
            Map<String, Object> response = webClient.get()
                    .uri("/v2/payment-requests/" + orderId)
                    .header("x-client-id", clientId)
                    .header("x-api-key", apiKey)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && "00".equals(response.get("code"))) {
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                if (data != null) {
                    String status = (String) data.get("status");
                    log.info("PayOS response status for Order #{}: {}", orderId, status);
                    if ("PAID".equalsIgnoreCase(status)) {
                        return "PAID";
                    } else if ("CANCELLED".equalsIgnoreCase(status) || "EXPIRED".equalsIgnoreCase(status)) {
                        return "FAILED";
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error verifying PayOS status for Order #{}: {}", orderId, e.getMessage(), e);
        }
        return "PENDING";
    }
}
