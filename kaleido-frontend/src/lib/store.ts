import { create } from "zustand";
import type { Locale } from "./i18n";

interface AppState {
  locale: Locale;
  darkMode: boolean;
  setLocale: (locale: Locale) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: "en",
  darkMode: false,
  setLocale: (locale) => set({ locale }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { darkMode: next };
    }),
}));
