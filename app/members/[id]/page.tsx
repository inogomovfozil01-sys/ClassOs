"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Copy,
  Check,
  School,
  Calendar,
  Sparkles,
  Shield,
  Clock,
  Eye,
  Volume2,
  VolumeX,
  X,
  Trash2,
  Send,
  Video,
  Image as ImageIcon,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/components/providers/auth-context";
import { useSocket } from "@/components/providers/socket-context";
import { getRoleDisplayName } from "@/lib/auth/rbac";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isUserOnline } = useSocket();

  const id = params?.id as string;
  const [profile, setProfile] = useState<any | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [busyChat, setBusyChat] = useState(false);

  // Fullscreen Story Viewer State
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [reactionHearts, setReactionHearts] = useState<{ id: number; x: number; y: number; emoji?: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/profiles/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Профиль недоступен");
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data.profile);
        setStories(data.stories || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOnline = id ? isUserOnline(id) : false;
  const isSelf = currentUser?.id === id;

  const handleStartChat = async () => {
    if (isSelf) {
      toast.info("Это ваш собственный профиль");
      return;
    }
    setBusyChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", targetUserId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось открыть диалог");
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

  const copyProfileLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Ссылка на профиль скопирована");
      });
    }
  };

  // Story Viewer Timer
  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  useEffect(() => {
    if (activeStoryIndex === null || isPaused || isHolding || !currentStory) return;

    if (
      currentStory.mediaType === "video" ||
      currentStory.mediaUrl?.includes(".mp4") ||
      currentStory.mediaUrl?.startsWith("data:video")
    ) {
      return;
    }

    const interval = 50;
    const step = (interval / 5000) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((i) => (i !== null ? i + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeStoryIndex, isPaused, isHolding, currentStory, stories.length]);

  // Story navigation
  const handlePrevStory = () => {
    if (activeStoryIndex !== null && activeStoryIndex > 0) {
      setActiveStoryIndex((i) => (i !== null ? i - 1 : null));
      setStoryProgress(0);
    }
  };

  const handleNextStory = () => {
    if (activeStoryIndex !== null) {
      if (activeStoryIndex < stories.length - 1) {
        setActiveStoryIndex((i) => (i !== null ? i + 1 : null));
        setStoryProgress(0);
      } else {
        setActiveStoryIndex(null);
      }
    }
  };

  // Hold-to-pause & tap-to-navigate
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("form") || target.closest("input")) return;

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
      setIsPaused(true);
    }, 180);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    const wasHolding = isHolding;
    setIsHolding(false);
    setIsPaused(false);

    if (!pointerDownPosRef.current) return;
    const deltaX = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerDownPosRef.current.y);
    const duration = Date.now() - pointerDownPosRef.current.time;
    pointerDownPosRef.current = null;

    if (wasHolding || duration >= 220 || deltaX > 20 || deltaY > 20) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    if (tapX < rect.width * 0.35) {
      handlePrevStory();
    } else {
      handleNextStory();
    }
  };

  const handleSendReaction = (emoji: string) => {
    if (!currentStory) return;
    const heartId = Date.now();
    const x = Math.random() * 50 + 25;
    const y = 80;
    setReactionHearts((prev) => [...prev, { id: heartId, x, y, emoji }]);
    setTimeout(() => {
      setReactionHearts((prev) => prev.filter((r) => r.id !== heartId));
    }, 1600);

    fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", storyId: currentStory.id, emoji }),
    }).catch(() => {});
    toast.success(`Реакция ${emoji} отправлена`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;
    const text = replyText.trim();
    setReplyText("");

    fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", storyId: currentStory.id, replyText: text }),
    }).catch(() => {});
    toast.success("Ответ отправлен автору в личные сообщения! 🚀");
  };

  return (
    <AppShell title={profile ? `${profile.firstName} ${profile.lastName}` : "Профиль"}>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Назад к списку класса</span>
          </Link>

          {isSelf && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors shadow-xs"
            >
              <Edit3 size={13} />
              <span>Настройки профиля</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="glass-panel rounded-3xl p-8 border border-border animate-pulse space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-full bg-surface-elevated" />
              <div className="w-48 h-6 rounded-xl bg-surface-elevated" />
              <div className="w-32 h-4 rounded-xl bg-surface-elevated" />
            </div>
          </div>
        ) : error ? (
          <div className="glass-panel rounded-3xl p-8 border border-border text-center space-y-3">
            <p className="text-danger font-semibold text-sm">{error}</p>
            <Link
              href="/members"
              className="inline-block px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold"
            >
              Вернуться к списку
            </Link>
          </div>
        ) : !profile ? null : (
          <div className="space-y-4 animate-fade-in">
            {/* ========================================================
                TELEGRAM PROFILE HEADER CARD
                ======================================================== */}
            <div className="glass-panel rounded-3xl border border-border shadow-xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-surface-secondary/70 to-transparent pointer-events-none" />

              {/* Avatar with Telegram Story Ring */}
              <div className="relative mb-3 mt-2">
                <div
                  className={`p-1 rounded-full transition-transform ${
                    stories.length > 0
                      ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-lg cursor-pointer hover:scale-105"
                      : "bg-surface-secondary border border-border"
                  }`}
                  onClick={() => {
                    if (stories.length > 0) setActiveStoryIndex(0);
                  }}
                  title={stories.length > 0 ? "Смотреть историю пользователя" : undefined}
                >
                  <div className="rounded-full p-0.5 bg-surface">
                    <UserAvatar
                      src={profile.avatarUrl}
                      name={`${profile.firstName} ${profile.lastName}`}
                      size={96}
                    />
                  </div>
                </div>

                {/* Online Status Dot */}
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-surface ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-500/50"
                  }`}
                  title={isOnline ? "В сети" : "Не в сети"}
                />
              </div>

              {/* Name and Role */}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{profile.firstName} {profile.lastName} {profile.middleName || ""}</span>
              </h1>

              {/* Status / Last seen */}
              <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1.5">
                {isOnline ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    в сети
                  </span>
                ) : (
                  <span>не в сети</span>
                )}
                <span>·</span>
                <span>{getRoleDisplayName(profile.role)}</span>
              </p>

              {/* Telegram Action Buttons (Message, Stories, Share) */}
              <div className="flex items-center justify-center gap-2.5 mt-5 w-full max-w-sm">
                {!isSelf && (
                  <button
                    type="button"
                    onClick={handleStartChat}
                    disabled={busyChat}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    <MessageSquare size={15} />
                    <span>{busyChat ? "Открытие..." : "Написать"}</span>
                  </button>
                )}

                {stories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveStoryIndex(0)}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-accent hover:opacity-95 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Sparkles size={15} />
                    <span>История ({stories.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={copyProfileLink}
                  className="py-2.5 px-3.5 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Скопировать ссылку"
                >
                  {copiedLink ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* ========================================================
                SECTION 1: ИНФОРМАЦИЯ (TELEGRAM STYLE INFO CARD)
                ======================================================== */}
            <div className="glass-panel rounded-3xl border border-border shadow-lg p-5 space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider px-1">
                Информация
              </h3>

              <div className="space-y-3 divide-y divide-border/60">
                {/* О себе (Bio) */}
                <div className="pt-1 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <Edit3 size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-foreground-muted font-medium">О себе</p>
                    <p className="text-xs sm:text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">
                      {profile.bio || "Пользователь пока не добавил описание о себе"}
                    </p>
                  </div>
                </div>

                {/* Имя пользователя (@username) */}
                {profile.username && (
                  <div className="pt-3 flex items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-purple-400 shrink-0">
                        <span className="text-xs font-bold font-mono">@</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-foreground-muted font-medium">Имя пользователя</p>
                        <p className="text-xs sm:text-sm text-accent font-mono font-semibold truncate">
                          @{profile.username}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={copyUsername}
                      className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground transition-colors"
                      title="Скопировать логин"
                    >
                      {copiedUsername ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}

                {/* Класс и школа */}
                <div className="pt-3 flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-sky-400 shrink-0">
                    <School size={15} />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground-muted font-medium">Класс & Заведение</p>
                    <p className="text-xs sm:text-sm text-foreground font-semibold">
                      7-«Б» класс · Школа №180
                    </p>
                  </div>
                </div>

                {/* Дата в системе */}
                <div className="pt-3 flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-emerald-400 shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <p className="text-[11px] text-foreground-muted font-medium">В системе</p>
                    <p className="text-xs sm:text-sm text-foreground">
                      С {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                SECTION 2: ИСТОРИИ ПОЛЬЗОВАТЕЛЯ (TELEGRAM STORIES CARD)
                ======================================================== */}
            {stories.length > 0 && (
              <div className="glass-panel rounded-3xl border border-border shadow-lg p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" />
                    <span>Активные истории (24 часа)</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                    {stories.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stories.map((st, idx) => (
                    <div
                      key={st.id}
                      onClick={() => setActiveStoryIndex(idx)}
                      className={`h-36 rounded-2xl relative overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all hover:scale-[1.02] border border-border ${
                        st.mediaUrl ? "bg-black" : `bg-gradient-to-br ${st.gradient}`
                      }`}
                    >
                      {st.mediaUrl &&
                        (st.mediaType === "video" ? (
                          <video
                            src={st.mediaUrl}
                            muted
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <img
                            src={st.mediaUrl}
                            alt="Story"
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ))}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                      {/* Sticker / Icon badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                        {st.sticker && <span className="text-sm">{st.sticker}</span>}
                        {st.mediaType === "video" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white font-mono flex items-center gap-0.5">
                            <Video size={10} />
                          </span>
                        )}
                      </div>

                      {/* Text snippet */}
                      <div className="absolute bottom-2 inset-x-2 z-10">
                        <p className="text-[11px] text-white font-medium line-clamp-2 leading-tight">
                          {st.text || "Без описания"}
                        </p>
                        <p className="text-[9px] text-white/70 mt-1 flex items-center gap-1">
                          <Clock size={9} />
                          <span>
                            {new Date(st.createdAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            FULLSCREEN STORY VIEWER MODAL
            ======================================================== */}
        {activeStoryIndex !== null && currentStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fade-in select-none">
            <div className="fixed inset-0" onClick={() => setActiveStoryIndex(null)} />

            <div
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              className="w-full max-w-sm sm:max-w-md h-[95vh] max-h-[840px] rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10 z-10 touch-none bg-black"
            >
              {/* Media */}
              {currentStory.mediaUrl ? (
                currentStory.mediaType === "video" ||
                currentStory.mediaUrl.endsWith(".mp4") ||
                currentStory.mediaUrl.endsWith(".webm") ||
                currentStory.mediaUrl.startsWith("data:video") ? (
                  <video
                    ref={videoRef}
                    src={currentStory.mediaUrl}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="absolute inset-0 w-full h-full object-cover"
                    onTimeUpdate={(e) => {
                      const vid = e.currentTarget;
                      if (vid.duration && !isNaN(vid.duration)) {
                        setStoryProgress((vid.currentTime / vid.duration) * 100);
                      }
                    }}
                    onEnded={handleNextStory}
                  />
                ) : (
                  <img
                    src={currentStory.mediaUrl}
                    alt="Story"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )
              ) : (
                <div
                  className={`absolute inset-0 w-full h-full bg-gradient-to-br ${currentStory.gradient}`}
                />
              )}

              {/* Shading */}
              <div
                className={`absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none transition-opacity duration-200 ${
                  isHolding ? "opacity-0" : "opacity-100"
                }`}
              />

              {/* Floating Hearts */}
              {reactionHearts.map((heart) => (
                <div
                  key={heart.id}
                  className="absolute text-5xl pointer-events-none animate-float-up z-40"
                  style={{ left: `${heart.x}%`, bottom: `${heart.y}px` }}
                >
                  {heart.emoji || "❤️"}
                </div>
              ))}

              {/* Top Progress Bar & Header */}
              <div
                className={`relative z-30 p-4 space-y-3 transition-opacity duration-200 ${
                  isHolding ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  {stories.map((s, idx) => {
                    let fill = 0;
                    if (idx < activeStoryIndex) fill = 100;
                    else if (idx === activeStoryIndex) fill = storyProgress;
                    return (
                      <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-75"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      src={profile?.avatarUrl}
                      name={`${profile?.firstName} ${profile?.lastName}`}
                      size={36}
                    />
                    <div>
                      <p className="text-xs font-bold leading-tight drop-shadow-md">
                        {profile?.firstName} {profile?.lastName}
                      </p>
                      <p className="text-[10px] text-white/70">
                        7-«Б» класс · Школа №180
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {(currentStory.mediaType === "video" ||
                      currentStory.mediaUrl?.includes(".mp4")) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMuted(!isMuted);
                        }}
                        className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveStoryIndex(null)}
                      className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Text & Sticker */}
              <div
                className={`relative z-20 px-6 my-auto text-center pointer-events-none transition-opacity duration-200 ${
                  isHolding ? "opacity-0" : "opacity-100"
                }`}
              >
                {currentStory.sticker && (
                  <div className="text-6xl mb-4 drop-shadow-xl animate-bounce">
                    {currentStory.sticker}
                  </div>
                )}
                {!currentStory.mediaUrl && currentStory.text && (
                  <p className="text-white text-lg sm:text-xl font-extrabold drop-shadow-lg leading-relaxed whitespace-pre-wrap">
                    {currentStory.text}
                  </p>
                )}
              </div>

              {/* Caption Overlay */}
              {currentStory.mediaUrl && currentStory.text && (
                <div
                  className={`relative z-20 px-4 pb-1 pointer-events-none transition-opacity duration-200 ${
                    isHolding ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="bg-black/65 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-white text-xs sm:text-sm font-medium shadow-lg leading-snug">
                    <p>{currentStory.text}</p>
                  </div>
                </div>
              )}

              {/* Bottom Interactions */}
              <div
                className={`relative z-30 p-4 space-y-3 transition-opacity duration-200 ${
                  isHolding ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              >
                {!isSelf && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      {["❤️", "🔥", "👏", "😂", "😮", "💯"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReaction(emoji);
                          }}
                          className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-all text-white"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={handleSendReply}
                      className="flex items-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ответить в чат..."
                        className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 p-1.5 rounded-full text-white/80 hover:text-white transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
