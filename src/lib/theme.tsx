import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCookie, setCookie } from "./cookies";

export type Theme = "cyber" | "sepia" | "marble";

const THEME_KEY = "kt_theme";
const CLASS_MAP: Record<Theme, string> = { cyber: "", sepia: "sepia", marble: "marble" };

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("sepia");

  useEffect(() => {
    const stored = (getCookie(THEME_KEY) ??
      (typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null)) as Theme | null;
    if (stored && ["cyber", "sepia", "marble"].includes(stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("sepia", "marble");
    const cls = CLASS_MAP[theme];
    if (cls) root.classList.add(cls);
    setCookie(THEME_KEY, theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
