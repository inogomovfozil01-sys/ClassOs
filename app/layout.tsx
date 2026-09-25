import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./design-system.css";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "ClassOS — Пространство класса",
  description: "Расписание, задания, общение и события вашего класса",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClassOS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f6f8" }, { media: "(prefers-color-scheme: dark)", color: "#111317" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('classos-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(d?'dark':'light');var u=navigator.userAgent,p=navigator.platform;document.documentElement.dataset.platform=/android/i.test(u)?'android':/iphone|ipad|ipod/i.test(u)||(/mac/i.test(p)&&navigator.maxTouchPoints>1)?'ios':/mac/i.test(p+u)?'mac':/win/i.test(p+u)?'windows':'web';}catch(e){}})();` }} /></head>
      <body className="bg-background text-foreground antialiased selection:bg-accent/30 selection:text-foreground">
        <AppProviders>{children}</AppProviders>
        <Toaster
          position="top-right"
          theme="system"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-overlay)",
            },
          }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
