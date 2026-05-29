package fit.iuh.ai_helper;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class OllamaRequestDto {
    private String model;
    private List<OllamaMessageDto> messages;
    private boolean stream;
}
