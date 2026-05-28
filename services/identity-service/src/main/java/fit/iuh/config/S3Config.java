package fit.iuh.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {

    @Value("${aws.access.key}")
    private String accessKey;

    @Value("${aws.secret.key}")
    private String secretKey;

    @Value("${aws.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        String resolvedAccessKey = hasText(accessKey) ? accessKey : "local-dev-access-key";
        String resolvedSecretKey = hasText(secretKey) ? secretKey : "local-dev-secret-key";
        String resolvedRegion = hasText(region) ? region : "ap-southeast-1";

        return S3Client.builder()
                .region(Region.of(resolvedRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(resolvedAccessKey, resolvedSecretKey)
                ))
                .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
