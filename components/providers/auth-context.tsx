"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  role: "OWNER" | "ADMIN" | "LEADER" | "TEACHER" | "STUDENT";
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  unreadNotifications: number;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  unreadNotifications: 0,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setUnreadNotifications(data.unreadNotifications || 0);
      } else {
        const data = await res.json().catch(() => ({}));
        setUser(null);
        if (data.needsSetup && pathname !== "/setup") {
          router.replace("/setup");
        } else if (pathname !== "/login" && pathname !== "/setup") {
          router.replace("/login");
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [pathname]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        unreadNotifications,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
