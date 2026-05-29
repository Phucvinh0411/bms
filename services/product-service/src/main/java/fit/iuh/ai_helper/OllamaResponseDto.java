package fit.iuh.ai_helper;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class OllamaResponseDto {
    private String model;
    private OllamaMessageDto message;
    private boolean done;
}
