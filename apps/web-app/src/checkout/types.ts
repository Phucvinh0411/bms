export interface CheckoutRequest {
  userId: number;
  shippingAddressId?: number;
  shippingAddress?: string;
  shippingLatitude?: number;
  shippingLongitude?: number;
  voucherCode?: string;
  items?: Array<{ bookId: number; quantity: number }>;
  paymentMethod?: string;
}

export interface ShippingAddress {
  id: number;
  userId: number;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface ShippingAddressRequest {
  userId: number;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface CheckoutPreviewResponse {
  subtotalAmount: number;
  baseShippingFee: number;
  shippingDiscount: number;
  orderDiscount: number;
  finalTotal: number;
  totalAmount?: number;
}

export interface CheckoutResponse extends CheckoutPreviewResponse {
  id: number;
  userId: number;
  status: string;
  orderDate?: string;
  shippingAddress?: string;
  checkoutUrl?: string;
  items?: Array<{ id: number; bookId: number; quantity: number; priceAtPurchase: number }>;
}

export interface ApiError {
  status?: number;
  message?: string;
  retryAfter?: string | number | null;
}
