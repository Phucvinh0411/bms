package fit.iuh.ai_helper;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IntentResponseDto {
    private String intent;
    private String keyword;
    private BigDecimal maxPrice;

    public static IntentResponseDto generalChatFallback() {
        return new IntentResponseDto(Intent.GENERAL_CHAT.name(), null, null);
    }
}

