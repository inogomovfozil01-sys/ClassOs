"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  X,
  Heart,
  Flame,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  Smile,
  Image as ImageIcon,
  Video,
  Volume2,
  VolumeX,
  Check,
  Eye,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface StoryViewer {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  viewedAt: string;
}

export interface StoryReaction {
  userId: string;
  userName: string;
  emoji: string;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  avatarUrl?: string | null;
  mediaUrl?: string;
  mediaType?: "video" | "image";
  gradient: string;
  text?: string;
  sticker?: string;
  createdAt: string;
  viewsCount: number;
  viewers?: StoryViewer[];
  reactions?: StoryReaction[];
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userRole?: string;
  avatarUrl?: string | null;
  hasUnseen: boolean;
  stories: StoryItem[];
}

const GRADIENT_PRESETS = [
  { id: "sunset", name: "Закат", value: "from-orange-500 via-rose-500 to-purple-600" },
  { id: "cyber", name: "Неон", value: "from-purple-600 via-indigo-600 to-blue-600" },
  { id: "emerald", name: "Аврора", value: "from-emerald-500 via-teal-600 to-cyan-600" },
  { id: "midnight", name: "Полночь", value: "from-slate-900 via-indigo-950 to-slate-900" },
  { id: "bubblegum", name: "Розовый", value: "from-pink-500 via-rose-400 to-amber-300" },
  { id: "solar", name: "Пламя", value: "from-amber-500 via-red-500 to-rose-600" },
];

const EMOJI_STICKERS = ["🔥", "❤️", "✨", "📚", "⚽", "🍕", "🎧", "⚡", "🎉", "🏆", "😎", "🚀"];

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) return "только что";
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    return "вчера";
  } catch {
    return "";
  }
}

function formatViewersWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "просмотров";
  if (mod10 === 1) return "просмотр";
  if (mod10 >= 2 && mod10 <= 4) return "просмотра";
  return "просмотров";
}

export function StoriesSection({
  currentUser,
}: {
  currentUser: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
}) {
  const [userStories, setUserStories] = useState<StoryItem[]>([]);
  const [classStoryGroups, setClassStoryGroups] = useState<StoryGroup[]>([]);

  // Seen stories set from localStorage
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("classos_seen_stories_v2");
        if (raw) return new Set(JSON.parse(raw));
      } catch {}
    }
    return new Set<string>();
  });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isViewersOpen, setIsViewersOpen] = useState(false);

  // Create form state
  const [newStoryText, setNewStoryText] = useState("");
  const [newStoryGradient, setNewStoryGradient] = useState(GRADIENT_PRESETS[0].value);
  const [newStorySticker, setNewStorySticker] = useState("🔥");
  const [newStoryMedia, setNewStoryMedia] = useState<string | null>(null);
  const [newStoryMediaType, setNewStoryMediaType] = useState<"image" | "video">("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [reactionHearts, setReactionHearts] = useState<{ id: number; x: number; y: number; emoji?: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Mark story as seen locally and save to localStorage
  const markStorySeen = useCallback((storyId: string) => {
    setSeenStoryIds((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("classos_seen_stories_v2", JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  }, []);

  // Fetch real stories from API
  const fetchRealStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories");
      if (res.ok) {
        const data = await res.json();
        if (data.groups && Array.isArray(data.groups)) {
          const myGroup = data.groups.find((g: StoryGroup) => g.userId === currentUser?.id);
          setUserStories(myGroup ? myGroup.stories : []);

          const otherGroups = data.groups.filter((g: StoryGroup) => g.userId !== currentUser?.id);
          setClassStoryGroups(otherGroups);
        }
      }
    } catch (err) {
      console.error("Failed to load real stories:", err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchRealStories();
    // Proactively clean up legacy mock keys
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("classos_stories_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }, [fetchRealStories]);

  // Video pause/play sync
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused || isHolding || isViewersOpen) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, isHolding, isViewersOpen]);

  // Reset video and progress on story change
  useEffect(() => {
    setStoryProgress(0);
    setIsViewersOpen(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [activeStoryIndex, activeViewerGroup]);

  // Auto-mark seen and inform server on view
  const currentStory = activeViewerGroup?.stories[activeStoryIndex];

  useEffect(() => {
    if (!currentStory) return;
    markStorySeen(currentStory.id);

    // If viewing classmate's story, record view on backend
    if (currentUser && currentStory.userId !== currentUser.id) {
      fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", storyId: currentStory.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.viewsCount !== undefined) {
            currentStory.viewsCount = data.viewsCount;
            if (data.viewers) currentStory.viewers = data.viewers;
          }
        })
        .catch(() => {});
    }
  }, [currentStory, currentUser, markStorySeen]);

  // Story Viewer Timer (for non-video stories)
  useEffect(() => {
    if (!activeViewerGroup) return;
    if (isPaused || isHolding || isViewersOpen) return;

    const current = activeViewerGroup.stories[activeStoryIndex];
    if (
      current?.mediaType === "video" ||
      current?.mediaUrl?.includes(".mp4") ||
      current?.mediaUrl?.startsWith("data:video")
    ) {
      return;
    }

    const interval = 50; // update progress every 50ms (total 5000ms = 5s)
    const step = (interval / 5000) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < activeViewerGroup.stories.length - 1) {
            setActiveStoryIndex((idx) => idx + 1);
            return 0;
          } else {
            const allGroups = getAllGroups();
            const currentGroupIdx = allGroups.findIndex((g) => g.userId === activeViewerGroup.userId);
            if (currentGroupIdx !== -1 && currentGroupIdx < allGroups.length - 1) {
              const nextGroup = allGroups[currentGroupIdx + 1];
              setActiveViewerGroup(nextGroup);
              setActiveStoryIndex(0);
              return 0;
            } else {
              setActiveViewerGroup(null);
              return 0;
            }
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeViewerGroup, activeStoryIndex, isPaused, isHolding, isViewersOpen]);

  const getAllGroups = (): StoryGroup[] => {
    const list: StoryGroup[] = [];
    if (userStories.length > 0 && currentUser) {
      list.push({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.username,
        userRole: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        hasUnseen: userStories.some((s) => !seenStoryIds.has(s.id)),
        stories: userStories,
      });
    }

    // Sort classmates: unviewed stories first, then viewed
    const processedOthers = classStoryGroups.map((group) => ({
      ...group,
      hasUnseen: group.stories.some((s) => !seenStoryIds.has(s.id)),
    }));

    processedOthers.sort((a, b) => {
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
      return 0;
    });

    list.push(...processedOthers);
    return list;
  };

  const handleOpenGroup = (group: StoryGroup) => {
    setActiveViewerGroup(group);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setIsPaused(false);
    setIsHolding(false);
    setIsViewersOpen(false);
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((i) => i - 1);
      setStoryProgress(0);
    } else {
      const allGroups = getAllGroups();
      const currentGroupIdx = allGroups.findIndex((g) => g.userId === activeViewerGroup?.userId);
      if (currentGroupIdx > 0) {
        const prevGroup = allGroups[currentGroupIdx - 1];
        setActiveViewerGroup(prevGroup);
        setActiveStoryIndex(prevGroup.stories.length - 1);
        setStoryProgress(0);
      }
    }
  };

  const handleNextStory = () => {
    if (!activeViewerGroup) return;
    if (activeStoryIndex < activeViewerGroup.stories.length - 1) {
      setActiveStoryIndex((i) => i + 1);
      setStoryProgress(0);
    } else {
      const allGroups = getAllGroups();
      const currentGroupIdx = allGroups.findIndex((g) => g.userId === activeViewerGroup.userId);
      if (currentGroupIdx !== -1 && currentGroupIdx < allGroups.length - 1) {
        const nextGroup = allGroups[currentGroupIdx + 1];
        setActiveViewerGroup(nextGroup);
        setActiveStoryIndex(0);
        setStoryProgress(0);
      } else {
        setActiveViewerGroup(null);
      }
    }
  };

  // Keyboard Navigation (Desktop Telegram / Instagram Web)
  useEffect(() => {
    if (!activeViewerGroup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextStory();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevStory();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isViewersOpen) {
          setIsViewersOpen(false);
        } else {
          setActiveViewerGroup(null);
        }
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
        e.preventDefault();
        setIsMuted((m) => !m);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeViewerGroup, activeStoryIndex, isViewersOpen]);

  // Hold-to-pause & tap-to-navigate handlers (Instagram / Telegram behavior)
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("form") ||
      target.closest("input") ||
      target.closest("textarea") ||
      isViewersOpen
    ) {
      return;
    }

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // After 180ms of holding, hide UI and pause story
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

    if (!pointerDownPosRef.current || isViewersOpen) return;
    const deltaX = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const deltaY = Math.abs(e.clientY - pointerDownPosRef.current.y);
    const duration = Date.now() - pointerDownPosRef.current.time;
    pointerDownPosRef.current = null;

    // If held for >= 220ms or dragged, it was a hold, don't trigger navigation
    if (wasHolding || duration >= 220 || deltaX > 20 || deltaY > 20) {
      return;
    }

    // Quick tap -> navigate
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    if (tapX < rect.width * 0.35) {
      handlePrevStory();
    } else {
      handleNextStory();
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setIsPaused(false);
    pointerDownPosRef.current = null;
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryText.trim() && !newStoryMedia) {
      toast.error("Добавьте фото, видео или напишите описание/текст");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalMediaUrl = newStoryMedia;

      // Real file upload via /api/files/upload
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.file?.downloadUrl) {
            finalMediaUrl = uploadData.file.downloadUrl;
          }
        }
      }

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newStoryText.trim() || undefined,
          gradient: newStoryGradient,
          sticker: newStorySticker,
          mediaUrl: finalMediaUrl || undefined,
          mediaType: newStoryMedia ? newStoryMediaType : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось опубликовать историю");
      }

      toast.success(
        newStoryMediaType === "video" && newStoryMedia
          ? "Видео-история опубликована на 24 часа для 7-«Б»! 🎬"
          : "История опубликована на 24 часа для 7-«Б»! 🔥",
      );
      setIsCreateOpen(false);
      setNewStoryText("");
      setNewStoryMedia(null);
      setSelectedFile(null);
      setNewStorySticker("🔥");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchRealStories();
    } catch (err: any) {
      toast.error(err.message || "Не удалось опубликовать историю");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCurrentStory = async () => {
    if (!activeViewerGroup || activeViewerGroup.userId !== currentUser?.id) return;
    const story = activeViewerGroup.stories[activeStoryIndex];
    if (!story) return;

    try {
      const res = await fetch(`/api/stories?id=${story.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Не удалось удалить историю");
      }

      toast.success("История удалена");
      await fetchRealStories();

      if (activeViewerGroup.stories.length <= 1) {
        setActiveViewerGroup(null);
      } else {
        setActiveStoryIndex(Math.max(0, activeStoryIndex - 1));
        setStoryProgress(0);
      }
    } catch (err: any) {
      toast.error(err.message || "Не удалось удалить историю");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      toast.error("Поддерживаются только фото и видео (MP4, WebM, PNG, JPG)");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Файл слишком большой (максимум 50 МБ)");
      return;
    }

    setSelectedFile(file);
    setNewStoryMediaType(isVideo ? "video" : "image");
    const previewUrl = URL.createObjectURL(file);
    setNewStoryMedia(previewUrl);
  };

  const handleSendReaction = (emoji: string) => {
    if (!currentStory) return;

    // Spawn floating emoji particles
    const id = Date.now();
    const x = Math.random() * 50 + 25; // 25% to 75%
    const y = 80;
    setReactionHearts((prev) => [...prev, { id, x, y, emoji }]);
    setTimeout(() => {
      setReactionHearts((prev) => prev.filter((r) => r.id !== id));
    }, 1600);

    // Send reaction to backend & direct notification/chat to author
    fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", storyId: currentStory.id, emoji }),
    })
      .then((r) => r.json())
      .then(() => {
        toast.success(`Реакция ${emoji} отправлена автору! 🎉`);
      })
      .catch(() => {});
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory) return;

    const textToSend = replyText.trim();
    setReplyText("");

    // Send reply to backend -> Direct conversation + notification
    fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", storyId: currentStory.id, replyText: textToSend }),
    })
      .then((r) => r.json())
      .then(() => {
        toast.success("Ответ отправлен автору в личные сообщения! 🚀");
      })
      .catch(() => {
        toast.error("Не удалось отправить ответ");
      });
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 animate-pulse" />
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            Истории 7-«Б» класса
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">
            24 часа
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
        >
          <Plus size={14} />
          <span>Добавить</span>
        </button>
      </div>

      {/* Stories Carousel (Instagram & Telegram style) */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar">
        {/* User's Story / Add Story Button */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 group">
          <div className="relative">
            {userStories.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  handleOpenGroup({
                    userId: currentUser?.id || "me",
                    userName:
                      `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
                      "Моя история",
                    userRole: currentUser?.role,
                    avatarUrl: currentUser?.avatarUrl,
                    hasUnseen: userStories.some((s) => !seenStoryIds.has(s.id)),
                    stories: userStories,
                  })
                }
                className="relative p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md hover:scale-105 active:scale-95 transition-all"
                title="Смотреть вашу историю"
              >
                <div className="rounded-full p-0.5 bg-surface">
                  <UserAvatar
                    src={currentUser?.avatarUrl}
                    name={`${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`}
                    size={58}
                  />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="relative p-[3px] rounded-full bg-surface-elevated border-2 border-dashed border-accent/60 hover:border-accent hover:scale-105 active:scale-95 transition-all shadow-sm"
                title="Опубликовать историю"
              >
                <div className="rounded-full p-0.5 bg-surface">
                  <UserAvatar
                    src={currentUser?.avatarUrl}
                    name={`${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`}
                    size={58}
                  />
                </div>
              </button>
            )}

            {/* Plus Icon Badge */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center border-2 border-surface shadow-md hover:scale-110 active:scale-90 transition-transform"
              title="Добавить историю"
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          </div>
          <span className="text-[11px] font-medium text-foreground max-w-[68px] truncate text-center">
            {userStories.length > 0 ? "Ваша история" : "Добавить"}
          </span>
        </div>

        {/* Classmates' Stories */}
        {getAllGroups()
          .filter((g) => g.userId !== currentUser?.id)
          .map((group) => {
            return (
              <div
                key={group.userId}
                onClick={() => handleOpenGroup(group)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div
                  className={`relative transition-all duration-300 group-hover:scale-105 active:scale-95 rounded-full ${
                    group.hasUnseen
                      ? "p-[3px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20"
                      : "p-[2px] border-2 border-border/80 bg-surface-elevated/40 opacity-75 group-hover:opacity-100"
                  }`}
                >
                  <div className="rounded-full p-0.5 bg-surface">
                    <UserAvatar src={group.avatarUrl} name={group.userName} size={58} />
                  </div>
                  {/* Unseen indicator dot */}
                  {group.hasUnseen && (
                    <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-accent border-2 border-surface" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-foreground max-w-[68px] truncate text-center group-hover:text-accent transition-colors">
                  {group.userName.split(" ")[0]}
                </span>
              </div>
            );
          })}

        {getAllGroups().filter((g) => g.userId !== currentUser?.id).length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-surface-elevated/40 border border-border/60 text-xs text-foreground-muted select-none">
            <Sparkles size={13} className="text-accent shrink-0" />
            <span className="text-[11px]">Истории одноклассников 7-«Б» появятся здесь</span>
          </div>
        )}
      </div>

      {/* ========================================================
          ADD STORY MODAL (INSTAGRAM / TELEGRAM STYLE)
          ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsCreateOpen(false)} />

          <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Новая история</h3>
                  <p className="text-[11px] text-foreground-muted">Будет видна 7-«Б» классу 24 часа</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Preview Box */}
            <div
              className={`w-full h-72 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between shadow-inner transition-all duration-300 ${
                newStoryMedia ? "bg-black" : `bg-gradient-to-br ${newStoryGradient}`
              }`}
            >
              {/* Media element (Video or Image) */}
              {newStoryMedia &&
                (newStoryMediaType === "video" ? (
                  <video
                    src={newStoryMedia}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={newStoryMedia}
                    alt="Story preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                ))}

              {/* Dark subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

              {/* Top info */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-semibold">
                  <UserAvatar
                    src={currentUser?.avatarUrl}
                    name={`${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`}
                    size={22}
                  />
                  <span>
                    {[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
                      "Вы"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {newStoryMedia && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {newStoryMediaType === "video" ? "🎬 Видео" : "📷 Фото"}
                    </span>
                  )}
                  <span className="text-2xl drop-shadow-md animate-bounce">{newStorySticker}</span>
                </div>
              </div>

              {/* Center or Bottom Caption Preview */}
              {!newStoryMedia ? (
                <div className="relative z-10 my-auto text-center px-3">
                  <p className="text-white text-base sm:text-lg font-bold drop-shadow-lg leading-snug whitespace-pre-wrap">
                    {newStoryText || "Ваш текст истории появится здесь..."}
                  </p>
                </div>
              ) : newStoryText ? (
                <div className="relative z-10 p-2.5 rounded-xl bg-black/65 backdrop-blur-md text-white text-xs border border-white/15 line-clamp-3">
                  <p className="leading-snug">{newStoryText}</p>
                </div>
              ) : (
                <div />
              )}

              {/* Bottom hint */}
              <div className="relative z-10 text-center">
                <span className="text-[10px] text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                  7-«Б» класс · Школа №180
                </span>
              </div>
            </div>

            {/* Story Editor Controls */}
            <form onSubmit={handleCreateStory} className="space-y-4 mt-4 text-xs">
              {/* Media Upload or Remove */}
              <div>
                <label className="block font-semibold text-foreground mb-1.5">
                  Фото или Видео
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />

                {newStoryMedia ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border">
                    <span className="text-xs text-foreground font-medium flex items-center gap-2 truncate">
                      {newStoryMediaType === "video" ? (
                        <Video size={16} className="text-purple-500 shrink-0" />
                      ) : (
                        <ImageIcon size={16} className="text-accent shrink-0" />
                      )}
                      <span className="truncate">
                        {selectedFile?.name ||
                          (newStoryMediaType === "video"
                            ? "Видео прикреплено"
                            : "Фото прикреплено")}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewStoryMedia(null);
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-danger hover:underline font-semibold shrink-0 ml-2"
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = "image/*";
                          fileInputRef.current.click();
                        }
                      }}
                      className="py-2.5 px-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-xs shadow-xs"
                    >
                      <ImageIcon size={16} className="text-accent" />
                      <span>Выбрать фото</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = "video/*";
                          fileInputRef.current.click();
                        }
                      }}
                      className="py-2.5 px-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground font-semibold flex items-center justify-center gap-2 transition-colors text-xs shadow-xs"
                    >
                      <Video size={16} className="text-purple-500" />
                      <span>Выбрать видео</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Description Input */}
              <div>
                <label className="block font-semibold text-foreground mb-1.5">
                  Описание к фото/видео или текст
                </label>
                <textarea
                  rows={2}
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  placeholder="Добавьте описание или мысль дня..."
                  className="w-full bg-surface-elevated border border-border rounded-2xl p-3 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent resize-none transition-colors"
                  maxLength={280}
                />
                <p className="text-[10px] text-foreground-muted text-right mt-1">
                  {newStoryText.length}/280
                </p>
              </div>

              {/* Gradient selector if no media */}
              {!newStoryMedia && (
                <div>
                  <label className="block font-semibold text-foreground mb-1.5">
                    Фон градиента
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setNewStoryGradient(g.value)}
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${g.value} shrink-0 transition-transform flex items-center justify-center text-white ${
                          newStoryGradient === g.value
                            ? "scale-110 ring-2 ring-accent shadow-md"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        title={g.name}
                      >
                        {newStoryGradient === g.value && <Check size={14} strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sticker Selector */}
              <div>
                <label className="block font-semibold text-foreground mb-1.5">
                  Стикер / Эмодзи
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {EMOJI_STICKERS.map((stk) => (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => setNewStorySticker(stk)}
                      className={`w-8 h-8 rounded-xl bg-surface-elevated border flex items-center justify-center text-base shrink-0 transition-transform ${
                        newStorySticker === stk
                          ? "border-accent bg-accent/15 scale-110"
                          : "border-border hover:border-foreground-muted"
                      }`}
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-border bg-surface hover:bg-surface-hover text-foreground font-semibold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-95 text-white font-semibold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{isSubmitting ? "Публикация..." : "Опубликовать"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          FULLSCREEN STORY VIEWER (INSTAGRAM / TELEGRAM STYLE)
          ======================================================== */}
      {activeViewerGroup && currentStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fade-in select-none">
          {/* Backdrop click to close */}
          <div
            className="fixed inset-0"
            onClick={() => {
              if (isViewersOpen) setIsViewersOpen(false);
              else setActiveViewerGroup(null);
            }}
          />

          {/* Main Story Container with Hold-to-Pause / Clean View */}
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
            className="w-full max-w-sm sm:max-w-md h-[95vh] max-h-[840px] rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10 z-10 touch-none bg-black"
          >
            {/* Background Media (Video, Photo or Gradient) */}
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

            {/* Dark gradient overlays for readability (fades out on hold) */}
            <div
              className={`absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none transition-opacity duration-200 ${
                isHolding ? "opacity-0" : "opacity-100"
              }`}
            />

            {/* Floating reaction hearts / emojis */}
            {reactionHearts.map((heart) => (
              <div
                key={heart.id}
                className="absolute text-5xl pointer-events-none animate-float-up z-40 drop-shadow-2xl"
                style={{ left: `${heart.x}%`, bottom: `${heart.y}px` }}
              >
                {heart.emoji || "❤️"}
              </div>
            ))}

            {/* ========================================================
                TOP BAR: PROGRESS BARS & AUTHOR INFO (Fades out on hold)
                ======================================================== */}
            <div
              className={`relative z-30 p-4 space-y-3 transition-opacity duration-200 ${
                isHolding ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              {/* Segmented Progress Bars */}
              <div className="flex items-center gap-1.5 w-full">
                {activeViewerGroup.stories.map((s, idx) => {
                  let fillPercent = 0;
                  if (idx < activeStoryIndex) fillPercent = 100;
                  else if (idx === activeStoryIndex) fillPercent = storyProgress;

                  return (
                    <div
                      key={s.id}
                      className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Author & Controls */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                    <UserAvatar
                      src={currentStory.avatarUrl || activeViewerGroup.avatarUrl}
                      name={currentStory.authorName}
                      size={36}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight drop-shadow-md">
                      {currentStory.authorName}
                    </p>
                    <p className="text-[10px] text-white/70 flex items-center gap-1">
                      <span>{currentStory.authorRole || "7-«Б»"}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(currentStory.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Sound mute toggle for video */}
                  {(currentStory.mediaType === "video" ||
                    currentStory.mediaUrl?.includes(".mp4") ||
                    currentStory.mediaUrl?.startsWith("data:video")) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted((prev) => !prev);
                      }}
                      className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                      title={isMuted ? "Включить звук" : "Выключить звук"}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}

                  {/* Delete button if current user */}
                  {activeViewerGroup.userId === currentUser?.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCurrentStory();
                      }}
                      className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-danger transition-colors"
                      title="Удалить историю"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveViewerGroup(null);
                    }}
                    className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                    title="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================
                CENTER CONTENT: TEXT & STICKER (Fades out on hold)
                ======================================================== */}
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

              {/* If text-only / gradient story */}
              {!currentStory.mediaUrl && currentStory.text && (
                <p className="text-white text-lg sm:text-xl font-extrabold drop-shadow-lg leading-relaxed whitespace-pre-wrap">
                  {currentStory.text}
                </p>
              )}
            </div>

            {/* ========================================================
                CAPTION OVERLAY (FOR PHOTO/VIDEO STORIES)
                ======================================================== */}
            {currentStory.mediaUrl && currentStory.text && (
              <div
                className={`relative z-20 px-4 pb-1 pointer-events-none transition-opacity duration-200 ${
                  isHolding ? "opacity-0" : "opacity-100"
                }`}
              >
                <div className="bg-black/65 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-white text-xs sm:text-sm font-medium shadow-lg leading-snug line-clamp-4">
                  <p>{currentStory.text}</p>
                </div>
              </div>
            )}

            {/* ========================================================
                BOTTOM INTERACTION BAR (TELEGRAM / INSTAGRAM STYLE)
                ======================================================== */}
            <div
              className={`relative z-30 p-4 space-y-3 transition-opacity duration-200 ${
                isHolding ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              {activeViewerGroup.userId === currentUser?.id ? (
                /* Author view: Who viewed my story */
                <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white">
                  <div className="flex items-center gap-2 pl-2">
                    <Eye size={16} className="text-accent" />
                    <span className="text-xs font-semibold">
                      {currentStory.viewers?.length || currentStory.viewsCount || 0}{" "}
                      {formatViewersWord(currentStory.viewers?.length || currentStory.viewsCount || 0)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsViewersOpen(true);
                      setIsPaused(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold text-white transition-colors"
                  >
                    Кто смотрел?
                  </button>
                </div>
              ) : (
                /* Classmate view: Quick reactions & Direct reply */
                <>
                  {/* Quick Reactions */}
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

                  {/* Reply Input Form & Views Count */}
                  <div className="flex items-center gap-2">
                    <form
                      onSubmit={handleSendReply}
                      className="flex-1 flex items-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ответить автору в чат..."
                        className="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 p-1.5 rounded-full text-white/80 hover:text-white transition-colors"
                        title="Отправить ответ"
                      >
                        <Send size={14} />
                      </button>
                    </form>

                    <div className="px-3 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-white/80 flex items-center gap-1.5 shrink-0">
                      <Eye size={13} className="text-accent" />
                      <span>{currentStory.viewers?.length || currentStory.viewsCount || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ========================================================
                VIEWERS BOTTOM SHEET (INSTAGRAM / TELEGRAM STYLE)
                ======================================================== */}
            {isViewersOpen && (
              <div
                className="absolute inset-x-0 bottom-0 max-h-[70%] z-50 bg-neutral-900/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl p-5 flex flex-col animate-slide-up shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2 text-white">
                    <Eye size={18} className="text-accent" />
                    <h4 className="font-bold text-sm">Просмотры истории</h4>
                    <span className="px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold">
                      {currentStory.viewers?.length || 0}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsViewersOpen(false);
                      setIsPaused(false);
                    }}
                    className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                  {currentStory.viewers && currentStory.viewers.length > 0 ? (
                    currentStory.viewers.map((viewer, idx) => (
                      <div
                        key={viewer.userId || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={viewer.avatarUrl}
                            name={viewer.userName}
                            size={32}
                          />
                          <div>
                            <p className="text-xs font-semibold leading-tight">
                              {viewer.userName}
                            </p>
                            <p className="text-[10px] text-white/60">Ученик 7-«Б»</p>
                          </div>
                        </div>

                        <span className="text-[10px] text-white/50 flex items-center gap-1">
                          <Clock size={11} />
                          <span>{formatRelativeTime(viewer.viewedAt)}</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-white/60 text-xs space-y-1">
                      <Users className="mx-auto text-white/40 mb-2" size={24} />
                      <p className="font-medium text-white/80">Пока никто не смотрел</p>
                      <p className="text-[11px] text-white/50">
                        Когда одноклассники из 7-«Б» откроют историю, они появятся здесь.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
