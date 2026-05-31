// src/api/apiConfig.ts

const productApiBase = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'http://localhost/api/v1/products';
export const BASE_URL = `${productApiBase}/api/books`;
export const HYBRID_SEARCH_URL = `${productApiBase}/api/v1/books/hybrid-search`;

// Hàm dùng chung để xử lý lỗi và convert data sang JSON
export const handleResponse = async <T>(response: Response): Promise<T | null> => {
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            // Thử parse errorText dưới dạng JSON
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.message || errJson.error || errorText;
        } catch (e) {
            // Không phải JSON, bỏ qua
        }
        throw new Error(errorMessage || 'Lỗi khi gọi API!');
    }
    // Trạng thái 204 (No Content) thường dùng cho hàm DELETE
    if (response.status === 204) return null;
    return response.json() as Promise<T>;
};
