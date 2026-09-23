import React, { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Mode = "dark" | "light";
const KEY = "internova-theme";

const ThemeCtx = createContext<{ mode: Mode; toggle: () => void }>({ mode: "dark", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light");

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(KEY, mode);
    } catch {}
  }, [mode]);

  return <ThemeCtx.Provider value={{ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
      className={`w-10 h-10 grid place-items-center rounded-xl transition shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-900/5 dark:text-cream-dim dark:hover:text-cream dark:hover:bg-white/10 ${className}`}>
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
