import { BASE_URL, handleResponse } from './apiConfig';
import type { Review } from '@/src/types';

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

  updateReview: async (
    reviewId: number,
    review: Partial<Review>,
    userId: number,
    userName: string
  ): Promise<Review | null> => {
    const url = new URL(`${BASE_URL}/reviews/${reviewId}`);
    url.searchParams.set('userId', String(userId));
    if (userName) {
      url.searchParams.set('userName', userName);
    }
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    return await handleResponse<Review>(response);
  },

  deleteReview: async (reviewId: number): Promise<null> => {
    const response = await fetch(`${BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
    });
    return await handleResponse<null>(response);
  },
};
