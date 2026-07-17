package fit.iuh.modules.order.dto;

public record ApiResponse<T>(
    String message,
    T data
) {
}
