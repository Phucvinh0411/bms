package fit.iuh.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ollama.ai")
@Getter
@Setter
public class OllamaAIProperties {
    private String chatUrl;
    private String cpuUrl;
    private Chat chat = new Chat();
    private Embedding embedding = new Embedding();
    private Intent intent = new Intent();

    public String getChatModel() {
        return chat != null ? chat.getModel() : null;
    }

    public String getEmbeddingModel() {
        return embedding != null ? embedding.getModel() : null;
    }

    /**
     * Lấy model cho bước Intent Extraction.
     * Nếu ollama.ai.intent.model không được cấu hình → tự động fallback về chat.model.
     */
    public String getIntentModel() {
        if (intent != null && intent.getModel() != null && !intent.getModel().isBlank()) {
            return intent.getModel();
        }
        return getChatModel();
    }

    @Getter
    @Setter
    public static class Chat {
        private String model;
    }

    @Getter
    @Setter
    public static class Embedding {
        private String model;
    }

    @Getter
    @Setter
    public static class Intent {
        private String model;
    }
}
