import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "ClassOS — Цифровая экосистема класса",
  description: "Закрытая цифровая экосистема одного школьного класса",
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
  themeColor: "#090a10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-accent/30 selection:text-foreground">
        <AppProviders>{children}</AppProviders>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
            },
          }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
