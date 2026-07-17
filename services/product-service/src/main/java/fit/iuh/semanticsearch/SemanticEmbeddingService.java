package fit.iuh.semanticsearch;

import fit.iuh.config.OpenRouterAIProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class SemanticEmbeddingService {

    private final RestClient restClient;
    private final OpenRouterAIProperties openRouterAIProperties;

    public SemanticEmbeddingService(@Qualifier("cpuRestClient") RestClient restClient,
                                    OpenRouterAIProperties openRouterAIProperties) {
        this.restClient = restClient;
        this.openRouterAIProperties = openRouterAIProperties;
    }

    public float[] generateEmbedding(String text) {
        OpenRouterEmbeddingRequest request = new OpenRouterEmbeddingRequest(openRouterAIProperties.getEmbeddingModel(), text);
        OpenRouterEmbeddingResponse response = callEmbeddingEndpoint("/embeddings", request);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new IllegalStateException("OpenRouter did not return an embedding");
        }

        List<Double> embedding = response.data().getFirst().embedding();
        if (embedding == null || embedding.isEmpty()) {
            throw new IllegalStateException("OpenRouter returned empty embedding list");
        }

        float[] vector = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            vector[i] = embedding.get(i).floatValue();
        }
        return vector;
    }

    private OpenRouterEmbeddingResponse callEmbeddingEndpoint(String path, OpenRouterEmbeddingRequest request) {
        return restClient.post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(OpenRouterEmbeddingResponse.class);
    }

    public String toVectorLiteral(float[] vector) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                builder.append(", ");
            }
            builder.append(vector[i]);
        }
        builder.append("]");
        return builder.toString();
    }

    private record OpenRouterEmbeddingRequest(String model, String input) {
    }

    private record OpenRouterEmbeddingResponse(List<EmbeddingData> data) {
        record EmbeddingData(List<Double> embedding) {}
    }
}
