package fit.iuh.order.module.client.promotion;

import fit.iuh.order.module.exception.BadRequestException;
import fit.iuh.order.module.exception.NotFoundException;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

@Component
public class PromotionServiceClient implements PromotionClient {

    private final RestTemplate restTemplate;

    @Value("${external.promotion-service.base-url:http://promotion-service:8084}")
    private String baseUrl;

    @Autowired
    public PromotionServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Optional<PromotionVoucherResponse> getVoucherByCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }

        String url = baseUrl + "/api/vouchers/code/" + code.trim();

        try {
            ResponseEntity<PromotionVoucherResponse> response = restTemplate.getForEntity(url, PromotionVoucherResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Optional.of(response.getBody());
            }

            throw new NotFoundException("Mã giảm giá không tồn tại: " + code);

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new NotFoundException("Mã giảm giá không tồn tại: " + code);
            } else if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                throw new BadRequestException("Yêu cầu không hợp lệ khi kiểm tra mã giảm giá: " + e.getResponseBodyAsString());
            }
            throw new BadRequestException("Lỗi từ hệ thống khuyến mãi: " + e.getMessage());
        } catch (HttpServerErrorException e) {
            throw new BadRequestException("Hệ thống khuyến mãi gặp sự cố, vui lòng thử lại sau: " + e.getMessage());
        } catch (Exception e) {
            throw new BadRequestException("Không thể kết nối đến hệ thống khuyến mãi: " + e.getMessage());
        }
    }
}
