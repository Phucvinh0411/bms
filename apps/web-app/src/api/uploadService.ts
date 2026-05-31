import { handleResponse } from './apiConfig';

const productApiBase = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || 'http://localhost/api/v1/products';
const UPLOAD_URL = `${productApiBase}/api/upload`;

export const uploadService = {
  uploadFile: async (file: File, folder: string = 'book-images'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${UPLOAD_URL}?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        body: formData,
    });
    
    const data = await handleResponse<{ url: string }>(response);
    return data?.url || '';
  }
};
