import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach auth token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("kaleido_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Shared in-flight refresh so concurrent 401s don't each spend the
// single-use refresh token.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("kaleido_refresh_token");
  if (!refreshToken) return null;
  try {
    // Use a bare axios call so this request doesn't loop through the
    // interceptors below.
    const res = await axios.post(`${API_URL}/v1/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token: newRefresh } = res.data.data;
    localStorage.setItem("kaleido_token", access_token);
    if (newRefresh) {
      localStorage.setItem("kaleido_refresh_token", newRefresh);
    }
    return access_token;
  } catch {
    return null;
  }
}

// Handle 401 responses: try one token refresh, then retry the original
// request. Only when refresh fails do we log the user out.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      original &&
      !original._retry
    ) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      localStorage.removeItem("kaleido_token");
      localStorage.removeItem("kaleido_refresh_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
