export interface Voucher {
  id?: number;
  code: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountAmount: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | string;
  description?: string;
}

const PROMOTION_BASE_URL = 'http://localhost/api/v1/promotions/api/vouchers';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || 'Lỗi khi gọi promotion-service');
  }
  return response.json() as Promise<T>;
}

export const promotionService = {
  async getVouchers(): Promise<Voucher[]> {
    const response = await fetch(PROMOTION_BASE_URL);
    return handleResponse<Voucher[]>(response);
  },

  async createVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    const response = await fetch(PROMOTION_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucher),
    });
    return handleResponse<Voucher>(response);
  },

  async updateVoucher(id: number, voucher: Voucher): Promise<Voucher> {
    const response = await fetch(`${PROMOTION_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucher),
    });
    return handleResponse<Voucher>(response);
  },

  async deleteVoucher(id: number): Promise<void> {
    const response = await fetch(`${PROMOTION_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error((await response.text()) || 'Lỗi khi xóa voucher');
    }
  },

  async askAI(message: string): Promise<string> {
    const response = await fetch(`${PROMOTION_BASE_URL}/ask-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: message,
    });
    if (!response.ok) {
      throw new Error((await response.text()) || 'Lỗi khi gọi AI voucher');
    }
    return response.text();
  },
};
