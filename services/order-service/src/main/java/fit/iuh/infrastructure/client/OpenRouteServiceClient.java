package fit.iuh.infrastructure.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fit.iuh.modules.shipping.model.StoreInfo;
import fit.iuh.modules.shipping.repository.StoreInfoRepository;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@Slf4j
@RequiredArgsConstructor
public class OpenRouteServiceClient implements RoutingClient {
    private final WebClient.Builder webClientBuilder;
    private final StoreInfoRepository storeInfoRepository;
    private final ObjectMapper objectMapper;

    @Value("${external.openrouteservice.base-url:https://api.openrouteservice.org}")
    private String baseUrl;

    @Value("${external.openrouteservice.api-key:}")
    private String apiKey;

    @Value("${shipping.default-store-latitude:10.822159}")
    private Double defaultStoreLat;

    @Value("${shipping.default-store-longitude:106.686824}")
    private Double defaultStoreLng;

    @Override
    @Retry(name = "backendCallRetry", fallbackMethod = "fallbackCalculateDistance")
    public Double calculateDistance(Double destLat, Double destLng) {
        log.info("Attempting to calculate distance to destination coordinates ({}, {})...", destLat, destLng);

        StoreInfo storeInfo = storeInfoRepository.findTopByOrderByIdAsc().orElse(null);
        Double storeLat = storeInfo != null ? storeInfo.getLatitude() : defaultStoreLat;
        Double storeLng = storeInfo != null ? storeInfo.getLongitude() : defaultStoreLng;

        if (apiKey == null || apiKey.isBlank()) {
            log.info("OpenRouteService API key not provided, defaulting directly to Haversine calculation.");
            return haversineKm(storeLat, storeLng, destLat, destLng);
        }

        String uri = String.format(
            "%s/v2/directions/driving-car?start=%s,%s&end=%s,%s",
            baseUrl,
            storeLng,
            storeLat,
            destLng,
            destLat
        );

        String response = webClientBuilder.build()
            .get()
            .uri(uri)
            .header("Authorization", apiKey)
            .retrieve()
            .bodyToMono(String.class)
            .block();

        if (response == null || response.isBlank()) {
            log.warn("Received empty response from OpenRouteService. Calculating using Haversine algorithm.");
            return haversineKm(storeLat, storeLng, destLat, destLng);
        }

        try {
            JsonNode root = objectMapper.readTree(response);
            double meters = root.path("features")
                .path(0)
                .path("properties")
                .path("summary")
                .path("distance")
                .asDouble();
            return meters / 1000d;
        } catch (Exception ex) {
            log.error("Failed to parse distance response. Falling back to Haversine.", ex);
            return haversineKm(storeLat, storeLng, destLat, destLng);
        }
    }

    public Double fallbackCalculateDistance(Double destLat, Double destLng, Exception ex) {
        log.error("All retry attempts failed to call OpenRouteService for ({}, {}). Error: {}. Activating safety fallback.",
            destLat, destLng, ex.getMessage());

        StoreInfo storeInfo = storeInfoRepository.findTopByOrderByIdAsc().orElse(null);
        Double storeLat = storeInfo != null ? storeInfo.getLatitude() : defaultStoreLat;
        Double storeLng = storeInfo != null ? storeInfo.getLongitude() : defaultStoreLng;

        return haversineKm(storeLat, storeLng, destLat, destLng);
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double r = 6371d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1))
            * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }
}
