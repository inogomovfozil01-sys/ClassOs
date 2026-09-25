"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Check,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";

export interface StoryItem {
  id: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  avatarUrl?: string | null;
  mediaUrl?: string;
  gradient: string;
  text?: string;
  sticker?: string;
  createdAt: string;
  viewsCount: number;
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

const EMOJI_STICKERS = ["🔥", "❤️", "✨", "📚", "⚽", "🍕", "🎧", "⚡", "🎉", "🏆"];

const DEFAULT_CLASS_STORIES: StoryGroup[] = [
  {
    userId: "class-1",
    userName: "Мадина С.",
    userRole: "Ученик",
    avatarUrl: "",
    hasUnseen: true,
    stories: [
      {
        id: "story-c1-1",
        userId: "class-1",
        authorName: "Мадина С.",
        authorRole: "Ученица 7-«А»",
        gradient: "from-purple-600 via-indigo-600 to-blue-600",
        text: "Сделала конспект по биологии на завтра! Если кому-то нужно сверить — пишите в чат 🌿📖",
        sticker: "📚",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        viewsCount: 14,
      },
    ],
  },
  {
    userId: "class-2",
    userName: "Шахзод Б.",
    userRole: "Ученик",
    avatarUrl: "",
    hasUnseen: true,
    stories: [
      {
        id: "story-c2-1",
        userId: "class-2",
        authorName: "Шахзод Б.",
        authorRole: "Ученик 7-«А»",
        gradient: "from-orange-500 via-rose-500 to-purple-600",
        text: "Кто идет на футбольную тренировку после 6-го урока? Собираемся на школьном поле ⚽🔥",
        sticker: "⚽",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        viewsCount: 19,
      },
    ],
  },
  {
    userId: "class-3",
    userName: "7-«А» Класс",
    userRole: "Лидер класса",
    avatarUrl: "",
    hasUnseen: true,
    stories: [
      {
        id: "story-c3-1",
        userId: "class-3",
        authorName: "7-«А» Класс",
        authorRole: "Официально",
        gradient: "from-emerald-500 via-teal-600 to-cyan-600",
        text: "Напоминание: в пятницу генеральная уборка кабинета и дежурство нашей группы ✨",
        sticker: "⚡",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        viewsCount: 26,
      },
    ],
  },
];

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
  const [classStoryGroups, setClassStoryGroups] = useState<StoryGroup[]>(DEFAULT_CLASS_STORIES);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeViewerGroup, setActiveViewerGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Create form state
  const [newStoryText, setNewStoryText] = useState("");
  const [newStoryGradient, setNewStoryGradient] = useState(GRADIENT_PRESETS[0].value);
  const [newStorySticker, setNewStorySticker] = useState("🔥");
  const [newStoryImage, setNewStoryImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [reactionHearts, setReactionHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user stories from localStorage
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const saved = localStorage.getItem(`classos_stories_${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only stories newer than 24h
          const now = Date.now();
          const valid = parsed.filter(
            (s: StoryItem) => now - new Date(s.createdAt).getTime() < 24 * 60 * 60 * 1000,
          );
          setUserStories(valid);
        }
      }
    } catch {}
  }, [currentUser?.id]);

  // Save user stories
  const persistUserStories = (updated: StoryItem[]) => {
    setUserStories(updated);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`classos_stories_${currentUser.id}`, JSON.stringify(updated));
      } catch {}
    }
  };

  // Story Viewer Timer
  useEffect(() => {
    if (!activeViewerGroup) return;

    if (isPaused) return;

    const interval = 50; // update progress every 50ms (total 5000ms = 5s)
    const step = (interval / 5000) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Move to next story or close
          if (activeStoryIndex < activeViewerGroup.stories.length - 1) {
            setActiveStoryIndex((idx) => idx + 1);
            return 0;
          } else {
            // Find next group or close
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
  }, [activeViewerGroup, activeStoryIndex, isPaused]);

  const getAllGroups = (): StoryGroup[] => {
    const list: StoryGroup[] = [];
    if (userStories.length > 0 && currentUser) {
      list.push({
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.username,
        userRole: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        hasUnseen: false,
        stories: userStories,
      });
    }
    list.push(...classStoryGroups);
    return list;
  };

  const handleOpenGroup = (group: StoryGroup) => {
    setActiveViewerGroup(group);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setIsPaused(false);
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((i) => i - 1);
      setStoryProgress(0);
    } else {
      // Previous group
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
      // Next group
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

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryText.trim() && !newStoryImage) {
      toast.error("Напишите текст или прикрепите фото");
      return;
    }

    setIsSubmitting(true);
    try {
      const newStory: StoryItem = {
        id: `story-${Date.now()}`,
        userId: currentUser?.id || "me",
        authorName: `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "Я",
        authorRole: currentUser?.role || "Ученик 7-«А»",
        avatarUrl: currentUser?.avatarUrl,
        gradient: newStoryGradient,
        mediaUrl: newStoryImage || undefined,
        text: newStoryText.trim() || undefined,
        sticker: newStorySticker,
        createdAt: new Date().toISOString(),
        viewsCount: 1,
      };

      const updated = [newStory, ...userStories];
      persistUserStories(updated);

      toast.success("История опубликована на 24 часа! 🔥");
      setIsCreateOpen(false);
      setNewStoryText("");
      setNewStoryImage(null);
      setNewStorySticker("🔥");
    } catch {
      toast.error("Не удалось опубликовать историю");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCurrentStory = () => {
    if (!activeViewerGroup || activeViewerGroup.userId !== currentUser?.id) return;
    const currentStory = activeViewerGroup.stories[activeStoryIndex];
    if (!currentStory) return;

    const remaining = userStories.filter((s) => s.id !== currentStory.id);
    persistUserStories(remaining);
    toast.success("История удалена");

    if (remaining.length === 0) {
      setActiveViewerGroup(null);
    } else {
      setActiveStoryIndex(Math.max(0, activeStoryIndex - 1));
      setStoryProgress(0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 8 МБ)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewStoryImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendReaction = (emoji: string) => {
    // Add floating reaction
    const id = Date.now();
    const x = Math.random() * 60 + 20; // 20% to 80%
    const y = 80;
    setReactionHearts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setReactionHearts((prev) => prev.filter((r) => r.id !== id));
    }, 1500);

    toast.success(`Реакция ${emoji} отправлена`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    toast.success(`Ответ отправлен автору: "${replyText.trim()}"`);
    setReplyText("");
  };

  const currentStory = activeViewerGroup?.stories[activeStoryIndex];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 animate-pulse" />
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            Истории 7-«А» класса
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

      {/* Stories Carousel */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 px-1 custom-scrollbar">
        {/* User Story / Add Story Button */}
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
                    hasUnseen: false,
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

        {/* Classmates Stories */}
        {classStoryGroups.map((group) => {
          return (
            <div
              key={group.userId}
              onClick={() => handleOpenGroup(group)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div
                className={`relative p-[3px] rounded-full transition-all duration-300 group-hover:scale-105 active:scale-95 ${
                  group.hasUnseen
                    ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md shadow-rose-500/20"
                    : "border-2 border-border bg-surface-elevated"
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
      </div>

      {/* ========================================================
          ADD STORY MODAL
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
                  <p className="text-[11px] text-foreground-muted">Будет видна классу 24 часа</p>
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
              className={`w-full h-64 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-inner transition-all duration-300 ${
                newStoryImage ? "bg-black" : `bg-gradient-to-br ${newStoryGradient}`
              }`}
            >
              {/* If Image is attached */}
              {newStoryImage && (
                <img
                  src={newStoryImage}
                  alt="Story preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                />
              )}

              {/* Top info */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-semibold">
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

                <span className="text-2xl drop-shadow-md animate-bounce">{newStorySticker}</span>
              </div>

              {/* Story Text */}
              <div className="relative z-10 my-auto text-center px-3">
                <p className="text-white text-base sm:text-lg font-bold drop-shadow-lg leading-snug whitespace-pre-wrap">
                  {newStoryText || "Ваш текст истории появится здесь..."}
                </p>
              </div>

              {/* Bottom hint */}
              <div className="relative z-10 text-center">
                <span className="text-[10px] text-white/80 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                  7-«А» класс · Школа №180
                </span>
              </div>
            </div>

            {/* Story Editor Controls */}
            <form onSubmit={handleCreateStory} className="space-y-4 mt-4 text-xs">
              {/* Text Input */}
              <div>
                <label className="block font-semibold text-foreground mb-1.5">
                  Текст истории или мысли
                </label>
                <textarea
                  rows={2}
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  placeholder="Что интересного произошло в школе? Напишите..."
                  className="w-full bg-surface-elevated border border-border rounded-2xl p-3 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent resize-none transition-colors"
                  maxLength={280}
                />
                <p className="text-[10px] text-foreground-muted text-right mt-1">
                  {newStoryText.length}/280
                </p>
              </div>

              {/* Gradient selector if no image */}
              {!newStoryImage && (
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

              {/* Photo Upload or Remove */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {newStoryImage ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated border border-border">
                    <span className="text-xs text-foreground font-medium flex items-center gap-1.5 truncate">
                      <ImageIcon size={14} className="text-accent shrink-0" />
                      Фото прикреплено
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewStoryImage(null)}
                      className="text-xs text-danger hover:underline font-semibold"
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <ImageIcon size={16} className="text-accent" />
                    <span>Прикрепить фотографию</span>
                  </button>
                )}
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
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-95 text-white font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in select-none"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Main Story Container */}
          <div className="w-full max-w-sm sm:max-w-md h-[92vh] max-h-[820px] rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10">
            {/* Background (Gradient or Photo) */}
            {currentStory.mediaUrl ? (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 w-full h-full bg-gradient-to-br ${currentStory.gradient}`}
              />
            )}

            {/* Dark gradient overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

            {/* Floating reaction hearts */}
            {reactionHearts.map((heart) => (
              <div
                key={heart.id}
                className="absolute text-4xl pointer-events-none animate-float-up z-30"
                style={{ left: `${heart.x}%`, bottom: `${heart.y}px` }}
              >
                ❤️
              </div>
            ))}

            {/* Click Navigation Overlays (Left 30% = Prev, Right 70% = Next) */}
            <div
              className="absolute left-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer"
              onClick={handlePrevStory}
              title="Назад"
            />
            <div
              className="absolute right-0 top-16 bottom-20 w-2/3 z-20 cursor-pointer"
              onClick={handleNextStory}
              title="Вперед"
            />

            {/* Top Bar: Progress Segments & Author Info */}
            <div className="relative z-30 p-4 space-y-3">
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
                      <span>{currentStory.authorRole || "7-«А»"}</span>
                      <span>·</span>
                      <span>
                        {new Date(currentStory.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Delete button if current user */}
                  {activeViewerGroup.userId === currentUser?.id && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrentStory}
                      className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-danger transition-colors"
                      title="Удалить историю"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setActiveViewerGroup(null)}
                    className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                    title="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Center Story Content & Sticker */}
            <div className="relative z-20 px-6 my-auto text-center pointer-events-none">
              {currentStory.sticker && (
                <div className="text-6xl mb-4 drop-shadow-xl animate-bounce">
                  {currentStory.sticker}
                </div>
              )}

              {currentStory.text && (
                <p className="text-white text-lg sm:text-xl font-extrabold drop-shadow-lg leading-relaxed whitespace-pre-wrap">
                  {currentStory.text}
                </p>
              )}
            </div>

            {/* Bottom Interaction Bar */}
            <div className="relative z-30 p-4 space-y-3">
              {/* Quick Reactions */}
              <div className="flex items-center justify-center gap-2">
                {["❤️", "🔥", "👏", "😂", "😮", "💯"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-all text-white"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input Form & Views Count */}
              <div className="flex items-center gap-2">
                <form onSubmit={handleSendReply} className="flex-1 flex items-center relative">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ответить на историю..."
                    className="w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 p-1.5 rounded-full text-white/80 hover:text-white transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </form>

                <div className="px-3 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[11px] text-white/80 flex items-center gap-1.5 shrink-0">
                  <Eye size={13} className="text-accent" />
                  <span>{currentStory.viewsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
