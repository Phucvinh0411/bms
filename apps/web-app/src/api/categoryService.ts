// src/api/categoryService.ts
import { handleResponse } from './apiConfig'; // Tái sử dụng apiConfig
import type { Category } from '@/src/types';

// Giả định backend có endpoint: GET /api/categories
// Đổi lại URL thực tế nếu endpoint của bạn khác.
const productApiBase = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'http://localhost/api/v1/products';
const CATEGORY_API_URL = `${productApiBase}/categories`;

export const categoryService = {
    getAllCategories: async (): Promise<Category[]> => {
        const response = await fetch(CATEGORY_API_URL);
        return (await handleResponse<Category[]>(response)) ?? [];
    },
    createCategory: async (data: { name: string, parentId?: number | null }): Promise<Category | null> => {
        const response = await fetch(CATEGORY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse<Category>(response);
    },
    updateCategory: async (id: number, data: { name: string, parentId?: number | null }): Promise<Category | null> => {
        const response = await fetch(`${CATEGORY_API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse<Category>(response);
    },
    deleteCategory: async (id: number): Promise<void> => {
        const response = await fetch(`${CATEGORY_API_URL}/${id}`, {
            method: 'DELETE'
        });
        await handleResponse(response);
    }
};
