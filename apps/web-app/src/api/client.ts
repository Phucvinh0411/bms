import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost/api/v1/identity";

type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthSyncListener = (tokens: AuthTokens | null) => void;

let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;
let authSyncListener: AuthSyncListener | null = null;

class ApiClient {
  private instance: AxiosInstance;

  private isNonRefreshableAuthEndpoint(url?: string) {
    if (!url) return false;
    return (
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/forgot-password")
    );
  }

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true, // Enable cookies for refresh token
    });

    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = currentAccessToken;
        if (
          token &&
          !config.url?.includes("/auth/login") &&
          !config.url?.includes("/auth/register")
        ) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !this.isNonRefreshableAuthEndpoint(originalRequest.url)
        ) {
          originalRequest._retry = true;

          try {
            const storedRefreshToken = currentRefreshToken;
            if (!storedRefreshToken) {
              throw new Error("No refresh token found");
            }

            const refreshResponse = await this.instance.post("/auth/refresh", {
              refreshToken: storedRefreshToken,
            });
            const { accessToken, refreshToken } = refreshResponse.data as {
              accessToken: string;
              refreshToken: string;
            };

            this.setTokens(accessToken, refreshToken);
            authSyncListener?.({ accessToken, refreshToken });
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            authSyncListener?.(null);
            // Redirect to login
            window.location.href = "/auth/login";
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  setAccessToken(token: string) {
    currentAccessToken = token;
  }

  setTokens(accessToken: string, refreshToken: string) {
    currentAccessToken = accessToken;
    currentRefreshToken = refreshToken;
  }

  clearTokens() {
    currentAccessToken = null;
    currentRefreshToken = null;
  }

  getClient() {
    return this.instance;
  }
}

export function setAuthToken(token: string | null) {
  currentAccessToken = token;
}

export function setRefreshToken(token: string | null) {
  currentRefreshToken = token;
}

export function setAuthTokens(accessToken: string | null, refreshToken: string | null) {
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
}

export function clearAuthTokens() {
  currentAccessToken = null;
  currentRefreshToken = null;
}

export function getAuthToken() {
  return currentAccessToken;
}

export function setAuthSyncListener(listener: AuthSyncListener | null) {
  authSyncListener = listener;
}

export const apiClient = new ApiClient();
export const httpClient = apiClient.getClient();
