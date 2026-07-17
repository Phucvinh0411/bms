package fit.iuh.config;

import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AiClientConfig {

    @Bean
    public HttpClient ollamaHttpClient() {
        PoolingHttpClientConnectionManager connManager =
            PoolingHttpClientConnectionManagerBuilder.create()
                .setMaxConnTotal(100)
                .setMaxConnPerRoute(50)
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                    .setConnectTimeout(Timeout.ofSeconds(10))
                    .setSocketTimeout(Timeout.ofMinutes(5))
                    .build())
                .build();

        return HttpClients.custom()
            .setConnectionManager(connManager)
            .setDefaultRequestConfig(RequestConfig.custom()
                .setConnectionRequestTimeout(Timeout.ofSeconds(5))
                .setResponseTimeout(Timeout.ofMinutes(5))
                .build())
            .evictExpiredConnections()
            .evictIdleConnections(Timeout.ofSeconds(30))
            .build();
    }

    @Bean
    public HttpComponentsClientHttpRequestFactory ollamaRequestFactory(HttpClient ollamaHttpClient) {
        return new HttpComponentsClientHttpRequestFactory(ollamaHttpClient);
    }

    @Bean("chatRestClient")
    public RestClient chatRestClient(OpenRouterAIProperties properties,
                                     HttpComponentsClientHttpRequestFactory ollamaRequestFactory) {
        return buildClient(properties, ollamaRequestFactory);
    }

    @Bean("cpuRestClient")
    public RestClient cpuRestClient(OpenRouterAIProperties properties,
                                    HttpComponentsClientHttpRequestFactory ollamaRequestFactory) {
        return buildClient(properties, ollamaRequestFactory);
    }

    private RestClient buildClient(OpenRouterAIProperties properties, HttpComponentsClientHttpRequestFactory requestFactory) {
        String baseUrl = properties.getBaseUrl();
        String effectiveBaseUrl = baseUrl == null || baseUrl.isBlank() ? "https://openrouter.ai/api/v1" : baseUrl.trim();
        String apiKey = properties.getApiKey() == null ? "" : properties.getApiKey().trim();
        return RestClient.builder()
            .baseUrl(effectiveBaseUrl)
            .requestFactory(requestFactory)
            .defaultHeader("Content-Type", "application/json")
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .defaultHeader("HTTP-Referer", "http://localhost:8080")
            .defaultHeader("X-OpenRouter-Title", "Bookstore Management System")
            .build();
    }
}
