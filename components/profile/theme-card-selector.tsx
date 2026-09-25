"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";

type ThemeOption = "dark" | "light" | "system";

export function ThemeCardSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("classos-theme") as ThemeOption) || "dark";
    setCurrentTheme(saved);

    const handleThemeChange = () => {
      const active = (localStorage.getItem("classos-theme") as ThemeOption) || "dark";
      setCurrentTheme(active);
    };

    window.addEventListener("classos-theme", handleThemeChange);
    return () => window.removeEventListener("classos-theme", handleThemeChange);
  }, []);

  const selectTheme = (theme: ThemeOption) => {
    setCurrentTheme(theme);
    localStorage.setItem("classos-theme", theme);
    window.dispatchEvent(new Event("classos-theme"));
  };

  const themes = [
    {
      id: "dark" as ThemeOption,
      name: "Тёмная",
      desc: "Глубокая ночная тема для комфорта глаз",
      icon: Moon,
      preview: {
        bg: "bg-[#090a10]",
        sidebar: "bg-[#11131f]",
        card: "bg-[#171926]",
        border: "border-white/10",
        accent: "bg-emerald-500",
      },
    },
    {
      id: "light" as ThemeOption,
      name: "Светлая",
      desc: "Яркое дневное оформление для высокой четкости",
      icon: Sun,
      preview: {
        bg: "bg-[#f4f5f8]",
        sidebar: "bg-[#e8ebf0]",
        card: "bg-[#ffffff]",
        border: "border-slate-200",
        accent: "bg-emerald-600",
      },
    },
    {
      id: "system" as ThemeOption,
      name: "Системная",
      desc: "Автоматически подстраивается под устройство",
      icon: Monitor,
      preview: {
        bg: "bg-gradient-to-r from-[#090a10] 50% to-[#f4f5f8] 50%",
        sidebar: "bg-[#11131f]",
        card: "bg-neutral-800/80",
        border: "border-neutral-500/30",
        accent: "bg-emerald-500",
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {themes.map((t) => {
        const isSelected = currentTheme === t.id;
        const Icon = t.icon;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTheme(t.id)}
            className={`group relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              isSelected
                ? "bg-accent/10 border-accent shadow-md shadow-accent/5 ring-2 ring-accent/20"
                : "bg-surface-elevated/40 hover:bg-surface-elevated border-border hover:border-border-strong"
            }`}
          >
            {/* Visual Mini Mockup */}
            <div
              className={`w-full h-20 rounded-xl mb-3 overflow-hidden border ${t.preview.border} ${t.preview.bg} relative p-2 shadow-inner`}
            >
              {/* Header simulation */}
              <div className="flex items-center justify-between mb-1.5 opacity-80">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className={`w-10 h-1.5 rounded-full ${t.preview.accent}`} />
              </div>

              {/* Grid content simulation */}
              <div className="flex gap-1.5 h-10">
                <div className={`w-1/3 rounded-lg ${t.preview.sidebar} opacity-90`} />
                <div className="flex-1 flex flex-col gap-1">
                  <div className={`h-4 rounded-lg ${t.preview.card} border ${t.preview.border}`} />
                  <div className={`flex-1 rounded-lg ${t.preview.card} border ${t.preview.border}`} />
                </div>
              </div>

              {/* Checkmark bubble if selected */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-md animate-scale-in">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Label and description */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  size={15}
                  className={isSelected ? "text-accent" : "text-foreground-muted group-hover:text-foreground"}
                />
                <span className="font-semibold text-xs text-foreground">
                  {t.name}
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed">
                {t.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
