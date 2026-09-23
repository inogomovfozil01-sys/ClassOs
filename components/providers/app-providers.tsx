"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "./auth-context";
import { SocketProvider } from "./socket-context";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = localStorage.getItem("classos-theme") || "dark";
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("classos-theme", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("classos-theme", apply);
    };
  }, []);
  return (
    <AuthProvider>
      <SocketProvider>{children}</SocketProvider>
    </AuthProvider>
  );
}

export function ThemeSelect() {
  return (
    <label className="theme-select">
      Оформление
      <select
        aria-label="Оформление"
        defaultValue={
          typeof window === "undefined"
            ? "dark"
            : localStorage.getItem("classos-theme") || "dark"
        }
        onChange={(e) => {
          localStorage.setItem("classos-theme", e.target.value);
          window.dispatchEvent(new Event("classos-theme"));
        }}
      >
        <option value="dark">Тёмное</option>
        <option value="light">Светлое</option>
        <option value="system">Системное</option>
      </select>
    </label>
  );
}
