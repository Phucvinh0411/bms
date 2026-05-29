package fit.iuh.semanticsearch;

import fit.iuh.config.OllamaAIProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class SemanticEmbeddingService {

    private final RestClient restClient;
    private final OllamaAIProperties ollamaAIProperties;

    public SemanticEmbeddingService(@Qualifier("cpuRestClient") RestClient restClient,
                                    OllamaAIProperties ollamaAIProperties) {
        this.restClient = restClient;
        this.ollamaAIProperties = ollamaAIProperties;
    }

    public float[] generateEmbedding(String text) {
        OllamaEmbeddingRequest request = new OllamaEmbeddingRequest(ollamaAIProperties.getEmbeddingModel(), text);
        OllamaEmbeddingResponse response = callEmbeddingEndpoint("/api/embed", request);

        if (response == null || !response.hasEmbedding()) {
            response = callEmbeddingEndpoint("/api/embeddings", request);
        }

        if (response == null || !response.hasEmbedding()) {
            throw new IllegalStateException("Ollama did not return an embedding");
        }

        List<Double> embedding = response.embedding();
        if (embedding == null || embedding.isEmpty()) {
            embedding = response.embeddings().getFirst();
        }

        float[] vector = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            vector[i] = embedding.get(i).floatValue();
        }
        return vector;
    }

    private OllamaEmbeddingResponse callEmbeddingEndpoint(String path, OllamaEmbeddingRequest request) {
        return restClient.post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(OllamaEmbeddingResponse.class);
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

    private record OllamaEmbeddingRequest(String model, String input) {
    }

    private record OllamaEmbeddingResponse(List<Double> embedding, List<List<Double>> embeddings) {
        boolean hasEmbedding() {
            if (embedding != null && !embedding.isEmpty()) {
                return true;
            }
            return embeddings != null && !embeddings.isEmpty() && embeddings.getFirst() != null && !embeddings.getFirst().isEmpty();
        }
    }
}
