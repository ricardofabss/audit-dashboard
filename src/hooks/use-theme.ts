"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            const root = document.documentElement;
            if (next === "light") {
              root.classList.add("light");
              root.classList.remove("dark");
              root.style.colorScheme = "light";
            } else {
              root.classList.add("dark");
              root.classList.remove("light");
              root.style.colorScheme = "dark";
            }
          }
          return { theme: next };
        }),
      setTheme: (theme) => {
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          if (theme === "light") {
            root.classList.add("light");
            root.classList.remove("dark");
            root.style.colorScheme = "light";
          } else {
            root.classList.add("dark");
            root.classList.remove("light");
            root.style.colorScheme = "dark";
          }
        }
        set({ theme });
      },
    }),
    { name: "auditsphere-theme-storage" }
  )
);
