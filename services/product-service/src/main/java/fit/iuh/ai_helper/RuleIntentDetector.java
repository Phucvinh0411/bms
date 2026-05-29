package fit.iuh.ai_helper;

import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class RuleIntentDetector {
    public Optional<Intent> detect(String message) {
        String msg = message.toLowerCase();
        if (msg.contains("tìm sách") || msg.contains("có sách nào") || msg.contains("mua sách")) {
            return Optional.of(Intent.BOOK_SEARCH);
        }
        if (msg.contains("đơn hàng") || msg.contains("tra cứu đơn") || msg.contains("vận chuyển")) {
            return Optional.of(Intent.ORDER_CHECKING);
        }
        return Optional.empty();
    }
}
