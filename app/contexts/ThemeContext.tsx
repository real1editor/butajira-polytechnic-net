"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "bpc-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Resolve the preference on the client but keep rendered markup identical
  // between server and client (theme consumers are CSS-driven), so hydration
  // is safe. The inline FOUC script in app/layout.tsx paints the same theme
  // before React hydrates, avoiding any flash.
  const [theme, setThemeState] = useState<Theme>(
    () => getStoredTheme() ?? "dark"
  );
  const [systemDark, setSystemDark] = useState<boolean>(
    () => getSystemTheme() === "dark"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (resolvedTheme === "dark") root.classList.add("dark");

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (themeColor) {
      themeColor.content = resolvedTheme === "dark" ? "#05070a" : "#eef1f4";
    }
  }, [resolvedTheme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures; the in-memory theme still applies.
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);