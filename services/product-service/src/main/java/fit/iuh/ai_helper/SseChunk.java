package fit.iuh.ai_helper;

public record SseChunk(String type, Object payload) {
    public static SseChunk text(String token) { return new SseChunk("text", token); }
    public static SseChunk bookCards(Object cards) { return new SseChunk("book_cards", cards); }
    public static SseChunk thinking(String step) { return new SseChunk("thinking", step); }
}
