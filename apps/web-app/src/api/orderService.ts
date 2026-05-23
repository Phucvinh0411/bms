import axios from 'axios';

const configuredBase = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || process.env.BACKEND_API_BASE_URL;
const DEFAULT_BASES = ['http://localhost/api/v1/orders'];
const BACKEND_BASE_CANDIDATES = Array.from(
  new Set([...DEFAULT_BASES, ...(configuredBase ? [configuredBase] : [])])
);

// Gateway strips /api/v1/orders/ prefix, leaving just the path.
// order-service controller is mapped at /api/orders/check-purchase
// So: gateway base http://localhost/api/v1/orders + /api/orders/check-purchase
//   → gateway strips /api/v1/orders/ → forwards /api/orders/check-purchase to order-service ✓
function buildCheckPurchaseUrl(base: string, userId: number, bookId: number) {
  const normalized = base.replace(/\/+$/, '');
  return `${normalized}/api/orders/check-purchase?userId=${userId}&bookId=${bookId}`;
}

export const orderService = {
  checkPurchase: async (userId: number, bookId: number): Promise<boolean> => {
    let lastError: any = null;
    
    for (const base of BACKEND_BASE_CANDIDATES) {
      const url = buildCheckPurchaseUrl(base, userId, bookId);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await axios.get(url, { headers });
        // Response data will be a boolean
        return response.data;
      } catch (err: any) {
        lastError = err;
        // Continue to next candidate on 404 or gateway errors
        if (err.response && [404, 502, 503, 504].includes(err.response.status)) {
            continue;
        }
      }
    }
    
    console.error('Error checking purchase:', lastError);
    return false; // Safe fallback
  }
};
