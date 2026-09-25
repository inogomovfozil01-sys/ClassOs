"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  BookOpen,
  Calendar,
  Newspaper,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications.filter((n: any) => !n.isRead).length);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Ошибка сохранения");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Все уведомления прочитаны");
    } catch {
      toast.error("Не удалось отметить уведомления");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "HOMEWORK":
        return <BookOpen className="w-4 h-4 text-accent" />;
      case "SCHEDULE":
        return <Calendar className="w-4 h-4 text-warning" />;
      case "NEWS":
        return <Newspaper className="w-4 h-4 text-success" />;
      default:
        return <AlertCircle className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-2xl bg-surface-elevated/70 border border-border hover:border-border-strong text-foreground-muted hover:text-foreground transition-all"
        title="Уведомления"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="notification-popover absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl glass-panel p-4 z-50  animate-fade-in border border-border-strong">
            <div className="notification-heading pb-3 border-b border-border mb-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-bold text-sm text-foreground">
                  Уведомления
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">
                    {unreadCount} новых
                  </span>
                )}
              </div>
              <div className="notification-heading-actions">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1 px-1.5 py-1 rounded-lg"
                  >
                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Прочитать все</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Закрыть уведомления"
                  className="icon-button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="py-8 text-center text-xs text-foreground-muted">
                  Загрузка...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-foreground-muted">
                  У вас пока нет уведомлений
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      item.isRead
                        ? "bg-surface-elevated/40 border-border/50 text-foreground-muted"
                        : "bg-surface-elevated border-border text-foreground shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-xl bg-surface border border-border shrink-0 mt-0.5">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] mt-0.5 leading-relaxed text-foreground-muted break-words">
                          {item.message}
                        </p>
                        <span className="text-[9px] text-foreground-muted/60 mt-1 block">
                          {new Date(item.createdAt).toLocaleDateString(
                            "ru-RU",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
