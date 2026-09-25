"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";

interface SocketContextType {
  socket: Socket | null;
  onlineUserIds: Set<string>;
  lastSeenMap: Record<string, string>;
  isConnected: boolean;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUserIds: new Set(),
  lastSeenMap: {},
  isConnected: false,
  isUserOnline: () => false,
  getUserLastSeen: () => null,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const isHeartbeatRunning = useRef(false);

  // Poll presence & send heartbeat via HTTP (reliable fallback for Serverless & Vercel)
  const syncPresence = useCallback(async () => {
    if (!user?.id || isHeartbeatRunning.current) return;
    isHeartbeatRunning.current = true;
    try {
      // Send heartbeat
      await fetch("/api/users/presence", { method: "POST" }).catch(() => {});

      // Fetch active users and lastSeen map
      const res = await fetch("/api/users/presence");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.onlineUserIds)) {
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            data.onlineUserIds.forEach((id: string) => next.add(id));
            if (user?.id) next.add(user.id);
            return next;
          });
        }
        if (data.lastSeen && typeof data.lastSeen === "object") {
          setLastSeenMap((prev) => ({ ...prev, ...data.lastSeen }));
        }
      }
    } catch {
      // Ignore network errors during heartbeat
    } finally {
      isHeartbeatRunning.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setOnlineUserIds(new Set());
      setLastSeenMap({});
      return;
    }

    // Always run initial presence sync
    syncPresence();
    const interval = setInterval(syncPresence, 25000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncPresence();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // If serverless, don't attempt persistent websocket connection
    if (process.env.NEXT_PUBLIC_SERVERLESS === "1") {
      setIsConnected(true);
      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }

    const socketInstance = io({
      path: "/api/socketio",
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      socketInstance.emit("auth", user.id);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on(
      "user:presence",
      ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (isOnline) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
        if (!isOnline) {
          setLastSeenMap((prev) => ({
            ...prev,
            [userId]: new Date().toISOString(),
          }));
        }
      },
    );

    setSocket(socketInstance);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socketInstance.disconnect();
    };
  }, [user?.id, syncPresence]);

  const isUserOnline = useCallback(
    (userId: string) => {
      if (userId === user?.id) return true;
      if (onlineUserIds.has(userId)) return true;
      const lastSeen = lastSeenMap[userId];
      if (lastSeen) {
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 90 * 1000;
      }
      return false;
    },
    [user?.id, onlineUserIds, lastSeenMap],
  );

  const getUserLastSeen = useCallback(
    (userId: string) => {
      return lastSeenMap[userId] || null;
    },
    [lastSeenMap],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUserIds,
        lastSeenMap,
        isConnected,
        isUserOnline,
        getUserLastSeen,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
