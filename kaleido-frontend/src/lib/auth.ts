import { create } from "zustand";
import { api } from "./api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  referral_code: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("kaleido_token") : null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("kaleido_token") : false,

  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token, user } = response.data.data;
    localStorage.setItem("kaleido_token", access_token);
    if (refresh_token) localStorage.setItem("kaleido_refresh_token", refresh_token);
    set({ token: access_token, user, isAuthenticated: true });
  },

  register: async (fullName: string, email: string, password: string) => {
    await api.post("/auth/register", {
      full_name: fullName,
      email,
      password,
    });
    return { success: true };
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem("kaleido_token");
    localStorage.removeItem("kaleido_refresh_token");
    set({ token: null, user: null, isAuthenticated: false });
    window.location.href = "/login";
  },

  fetchUser: async () => {
    try {
      const response = await api.get("/auth/me");
      const user = response.data.data?.user || response.data.data;
      set({ user, isAuthenticated: true });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 401) {
        localStorage.removeItem("kaleido_token");
        localStorage.removeItem("kaleido_refresh_token");
        set({ token: null, user: null, isAuthenticated: false });
      }
      throw error;
    }
  },

  initialize: async () => {
    const token = localStorage.getItem("kaleido_token");
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }
    set({ token });
    try {
      await get().fetchUser();
    } catch {
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
