package fit.iuh.ai_helper;

import java.util.List;

public record OpenRouterStreamChunk(List<Choice> choices) {
    public record Choice(Delta delta) {}
    public record Delta(String content) {}
}
