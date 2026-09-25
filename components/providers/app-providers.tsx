"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider } from "./auth-context";
import { SocketProvider } from "./socket-context";
import { detectPlatform } from "@/lib/platform";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.platform = detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    const updateHeight = () => document.documentElement.style.setProperty("--app-height", `${Math.round(window.visualViewport?.height || window.innerHeight)}px`);
    updateHeight();
    window.visualViewport?.addEventListener("resize", updateHeight);
    window.addEventListener("resize", updateHeight);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let theme = "system";
      try { theme = localStorage.getItem("classos-theme") || "system"; } catch {}
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.classList.toggle("light", !dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("classos-theme", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.removeEventListener("resize", updateHeight);
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
            ? "system"
            : localStorage.getItem("classos-theme") || "system"
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
