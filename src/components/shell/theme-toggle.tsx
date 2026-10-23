"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// El tema vive en <html data-theme>; el componente lo lee como store externo.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

function applyTheme(t: Theme, persist: boolean) {
  document.documentElement.dataset.theme = t;
  if (persist) {
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* almacenamiento bloqueado: se ignora */
    }
  }
  listeners.forEach((cb) => cb());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      /* se usa la preferencia del sistema */
    }
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(saved === "dark" || saved === "light" ? saved : system, false);
  }, []);

  const choose = (t: Theme) => applyTheme(t, true);

  const base = "grid size-9 place-items-center rounded-pill transition-colors";
  return (
    <div role="group" aria-label="Tema" className="flex flex-col gap-1">
      <button type="button" aria-label="Tema claro" aria-pressed={theme === "light"} onClick={() => choose("light")}
        className={`${base} ${theme === "light" ? "bg-surface shadow-card" : "text-muted"}`}>
        <Sun size={16} aria-hidden />
      </button>
      <button type="button" aria-label="Tema oscuro" aria-pressed={theme === "dark"} onClick={() => choose("dark")}
        className={`${base} ${theme === "dark" ? "bg-surface shadow-card" : "text-muted"}`}>
        <Moon size={16} aria-hidden />
      </button>
    </div>
  );
}
