// src/types/index.ts
// Định nghĩa các interface dùng chung cho toàn bộ ứng dụng

// ===== Book =====
export interface Book {
  id: number;
  title: string;
  author: string;
  publisher: string;
  price: number;
  description: string;
  categoryId: number;
  category?: Category;
  images?: BookImage[];
  reviews?: Review[];
  imageUrl?: string;
  secondaryImages?: BookImage[];
  stockQuantity?: number;
  status?: string;
  rating?: number;
  originalPrice?: string;
  image?: string;
  isDeleted?: boolean;
  [key: string]: unknown; // Cho phép các field mở rộng từ API
}

export interface BookCreateRequest {
  title: string;
  author: string;
  publisher: string;
  price: number;
  description: string;
  categoryId: number;
}

export type BookUpdateRequest = BookCreateRequest;

// ===== Category =====
export interface Category {
  id: number;
  name: string;
  parentId?: number | null;
  subCategories?: Category[];
}

// ===== Review =====
export interface Review {
  id: number;
  bookId?: number;
  userName: string;
  userId?: number;
  content: string;
  rating: number;
  mediaUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewCreateRequest {
  userName: string;
  userId?: number;
  content: string;
  rating: number;
  mediaUrls?: string[];
}

export interface ReviewUpdateRequest {
  content: string;
  rating: number;
  mediaUrls?: string[];
}

// ===== BookImage =====
export interface BookImage {
  id: number;
  bookId: number;
  imageUrl: string;
}
