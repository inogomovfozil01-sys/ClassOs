"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React, { useState, useEffect } from "react";
import { Download, Check, Share, X, Smartphone } from "lucide-react";

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-success-muted/20 border border-success/30 text-success text-xs font-medium">
        <Check className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">ClassOS установлен</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 text-xs font-semibold transition-all shadow-sm"
        title="Установить приложение ClassOS"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Установить ClassOS</span>
      </button>

      {/* iOS / Browser Install Instructions Modal */}
      {showIOSModal && (
        <ViewportLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-border-strong text-left">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm text-foreground">
                  Установка ClassOS
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-foreground-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-foreground-muted leading-relaxed">
              <p>
                {isIOS
                  ? "Установка на iPhone и iPad:"
                  : "Откройте меню браузера и выберите «Установить ClassOS» или «Установить приложение»."}
              </p>
              <div
                hidden={!isIOS}
                className="p-3 rounded-2xl bg-surface-elevated border border-border space-y-2"
              >
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Share className="w-4 h-4 text-accent" />
                  <span>1. Нажмите кнопку «Поделиться» в браузере</span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Download className="w-4 h-4 text-accent" />
                  <span>
                    2. Выберите «На экран «Домой» (Add to Home Screen)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-foreground-muted/80">
                После этого ClassOS будет открываться в полноэкранном режиме с
                поддержкой оффлайн-доступа и быстрым входом.
              </p>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium text-xs transition-colors"
            >
              Понятно
            </button>
          </div>
        </ViewportLayer>
      )}
    </>
  );
}
