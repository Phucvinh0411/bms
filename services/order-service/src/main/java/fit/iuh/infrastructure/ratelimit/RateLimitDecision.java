package fit.iuh.infrastructure.ratelimit;

public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {
}