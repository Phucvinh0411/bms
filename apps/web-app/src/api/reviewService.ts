import { BASE_URL, handleResponse } from './apiConfig';

export interface Review {
  id?: number;
  content: string;
  rating: number;
  userName: string;
  userId: number;
  createdAt?: string;
  updatedAt?: string;
}

export const reviewService = {
  getReviewsOfBook: async (bookId: number): Promise<Review[]> => {
    const response = await fetch(`${BASE_URL}/${bookId}/reviews`);
    return (await handleResponse<Review[]>(response)) ?? [];
  },

  addReviewToBook: async (bookId: number, review: Omit<Review, 'id'>): Promise<Review | null> => {
    const response = await fetch(`${BASE_URL}/${bookId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    return await handleResponse<Review>(response);
  },
};
