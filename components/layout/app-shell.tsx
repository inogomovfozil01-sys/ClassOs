"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/providers/auth-context";
import { SocketProvider } from "@/components/providers/socket-context";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Header } from "./header";
import { CommandPalette } from "@/components/ui/command-palette";
import { JarvisPanel } from "@/components/ai/jarvis-panel";
import { Skeleton } from "@/components/ui/workspace";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

function ShellInner({ children, title }: AppShellProps) {
  const { user, loading } = useAuth();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-shell">
      {/* Desktop Floating Sidebar */}
      <DesktopSidebar />

      {/* Main Workspace with 18px gap on desktop and 24px right padding */}
      <div className="workspace">
        <Header
          title={title}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenJarvis={() => setIsJarvisOpen(true)}
        />

        <main className="workspace-content">{children}</main>
      </div>

      {/* Mobile Floating Bottom Navigation */}
      <MobileBottomNav />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenJarvis={() => setIsJarvisOpen(true)}
      />

      {/* JARVIS Sliding Panel */}
      <JarvisPanel
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
      />
    </div>
  );
}

export function AppShell({ children, title }: AppShellProps) {
  return <ShellInner title={title}>{children}</ShellInner>;
}
