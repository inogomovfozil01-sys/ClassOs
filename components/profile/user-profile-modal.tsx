"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  MessageSquare,
  Copy,
  Check,
  School,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  Clock,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSocket } from "@/components/providers/socket-context";
import { useAuth } from "@/components/providers/auth-context";
import { getRoleDisplayName } from "@/lib/auth/rbac";

export function UserProfileModal({
  userId,
  isOpen,
  onClose,
  onOpenStory,
}: {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenStory?: (stories: any[], startIndex: number) => void;
}) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isUserOnline } = useSocket();

  const [profile, setProfile] = useState<any | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [busyChat, setBusyChat] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setStories([]);
      return;
    }

    setLoading(true);
    fetch(`/api/profiles/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Профиль недоступен");
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile);
        setStories(data.stories || []);
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  const isOnline = isUserOnline(userId);
  const isSelf = currentUser?.id === userId;

  const handleStartChat = async () => {
    if (isSelf) {
      toast.info("Это ваш профиль");
      return;
    }
    setBusyChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", targetUserId: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось открыть диалог");
      onClose();
      router.push(`/chats?conversation=${data.conversation.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyChat(false);
    }
  };

  const copyUsername = () => {
    if (!profile?.username) return;
    navigator.clipboard.writeText(`@${profile.username}`).then(() => {
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
      toast.success("Имя пользователя скопировано");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Telegram Style Drawer Sheet */}
      <div
        className="w-full max-w-sm sm:max-w-md h-full bg-surface border-l border-border shadow-2xl relative z-10 flex flex-col justify-between overflow-y-auto custom-scrollbar animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Информация о профиле</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex flex-col items-center gap-4 text-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-surface-elevated" />
              <div className="w-40 h-5 rounded-xl bg-surface-elevated" />
              <div className="w-28 h-4 rounded-xl bg-surface-elevated" />
            </div>
          ) : !profile ? (
            <div className="p-8 text-center text-foreground-muted text-xs">
              Профиль недоступен
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* Telegram Avatar & Header */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2.5">
                  <div
                    className={`p-1 rounded-full ${
                      stories.length > 0
                        ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md cursor-pointer hover:scale-105 transition-transform"
                        : "bg-surface-secondary border border-border"
                    }`}
                    onClick={() => {
                      if (stories.length > 0 && onOpenStory) {
                        onOpenStory(stories, 0);
                        onClose();
                      }
                    }}
                    title={stories.length > 0 ? "Смотреть историю" : undefined}
                  >
                    <div className="rounded-full p-0.5 bg-surface">
                      <UserAvatar
                        src={profile.avatarUrl}
                        name={`${profile.firstName} ${profile.lastName}`}
                        size={80}
                      />
                    </div>
                  </div>

                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${
                      isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-500/50"
                    }`}
                  />
                </div>

                <h2 className="text-lg font-bold text-foreground">
                  {profile.firstName} {profile.lastName} {profile.middleName || ""}
                </h2>

                <p className="text-xs text-foreground-muted mt-0.5 flex items-center gap-1.5">
                  {isOnline ? (
                    <span className="text-emerald-500 font-semibold">в сети</span>
                  ) : (
                    <span>не в сети</span>
                  )}
                  <span>·</span>
                  <span>{getRoleDisplayName(profile.role)}</span>
                </p>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 mt-4 w-full">
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={handleStartChat}
                      disabled={busyChat}
                      className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <MessageSquare size={14} />
                      <span>{busyChat ? "..." : "Написать"}</span>
                    </button>
                  )}

                  <Link
                    href={`/members/${profile.id}`}
                    onClick={onClose}
                    className="flex-1 py-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink size={14} />
                    <span>Профиль</span>
                  </Link>
                </div>
              </div>

              {/* Information Section */}
              <div className="space-y-3.5 pt-3 border-t border-border">
                {/* Bio / О себе */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Edit3 size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-foreground-muted font-medium">О себе</p>
                    <p className="text-xs text-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
                      {profile.bio || "Описание не указано"}
                    </p>
                  </div>
                </div>

                {/* Username */}
                {profile.username && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-purple-400 shrink-0">
                        <span className="text-[11px] font-bold font-mono">@</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-foreground-muted font-medium">Логин</p>
                        <p className="text-xs text-accent font-mono font-semibold truncate">
                          @{profile.username}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={copyUsername}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground transition-colors"
                      title="Скопировать логин"
                    >
                      {copiedUsername ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}

                {/* Class */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-sky-400 shrink-0">
                    <School size={13} />
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground-muted font-medium">Класс</p>
                    <p className="text-xs text-foreground font-semibold">
                      7-«Б» класс · Школа №180
                    </p>
                  </div>
                </div>

                {/* Registered date */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-emerald-400 shrink-0">
                    <Calendar size={13} />
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground-muted font-medium">В системе</p>
                    <p className="text-xs text-foreground">
                      С {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Stories */}
              {stories.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-accent" />
                      <span>Истории ({stories.length})</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {stories.map((st, idx) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          if (onOpenStory) {
                            onOpenStory(stories, idx);
                            onClose();
                          }
                        }}
                        className={`h-24 rounded-xl relative overflow-hidden cursor-pointer group border border-border ${
                          st.mediaUrl ? "bg-black" : `bg-gradient-to-br ${st.gradient}`
                        }`}
                      >
                        {st.mediaUrl &&
                          (st.mediaType === "video" ? (
                            <video
                              src={st.mediaUrl}
                              muted
                              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100"
                            />
                          ) : (
                            <img
                              src={st.mediaUrl}
                              alt="Story"
                              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100"
                            />
                          ))}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-1.5 inset-x-2 z-10">
                          <p className="text-[10px] text-white font-medium line-clamp-1">
                            {st.text || (st.mediaType === "video" ? "Видео" : "Фото")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border text-center">
          <p className="text-[11px] text-foreground-muted">
            ClassOS · 7-«Б» класс · Школа №180
          </p>
        </div>
      </div>
    </div>
  );
}
