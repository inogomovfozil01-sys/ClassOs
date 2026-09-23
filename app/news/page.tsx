"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { canPublishNews } from "@/lib/auth/rbac";
import {
  Newspaper,
  Plus,
  MessageCircle,
  Heart,
  Share2,
  X,
  Send,
  User,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { MediaViewer } from "@/components/media/media-viewer";
import { uploadFile } from "@/lib/upload";
import { FileCard } from "@/components/media/file-card";

const EMOJIS = ["👍", "❤️", "🔥", "👏", "🎉"];
const CATEGORIES = ["Все", "Общее", "Объявления", "Мероприятия", "Срочно"];

function NewsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Все");

  // Creation modal
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Объявления");
  const [allowComments, setAllowComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [coverProgress, setCoverProgress] = useState(0);
  const [viewCover, setViewCover] = useState<string | null>(null);

  // Active open comment thread
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(
    null,
  );
  const [commentText, setCommentText] = useState("");

  const canCreate = canPublishNews(user?.role);
  useEffect(() => {
    if (!loading) {
      const id = searchParams.get("post");
      if (id)
        document
          .getElementById("post-" + id)
          ?.scrollIntoView({ block: "start" });
    }
  }, [loading, searchParams]);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canCreate) {
      setIsOpen(true);
    }
  }, [searchParams, canCreate]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleReaction = async (postId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/news/${postId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch {
      toast.error("Не удалось поставить реакцию");
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/news/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText("");
        fetchPosts();
        toast.success("Комментарий добавлен");
      }
    } catch {
      toast.error("Не удалось отправить комментарий");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    try {
      let coverUrl;
      if (cover) {
        const form = new FormData();
        form.append("file", cover);
        const d = await uploadFile(form, setCoverProgress);
        coverUrl = d.file.downloadUrl;
      }
      const gallery = { images: [] as string[], files: [] as any[] };
      for (const file of extraFiles) {
        const form = new FormData();
        form.append("file", file);
        const d = await uploadFile(form, setCoverProgress);
        if (file.type.startsWith("image/"))
          gallery.images.push(d.file.downloadUrl);
        else
          gallery.files.push({
            fileName: file.name,
            fileUrl: d.file.downloadUrl,
            fileSize: file.size,
            mimeType: file.type,
          });
      }
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
          allowComments,
          coverUrl,
          gallery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Новость успешно опубликована");
      setIsOpen(false);
      setTitle("");
      setContent("");
      setCover(null);
      setExtraFiles([]);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPosts = posts.filter(
    (p) => activeCategory === "Все" || p.category === activeCategory,
  );

  return (
    <AppShell title="Новости класса">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Новости и объявления
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Официальные новости класса, важные сообщения и фотоотчеты
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Опубликовать новость</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                activeCategory === cat
                  ? "bg-accent text-white shadow-sm"
                  : "glass-panel text-foreground-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts list */}
        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка ленты...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-3 border border-border">
            <Newspaper className="w-10 h-10 text-accent mx-auto" />
            <h3 className="font-bold text-sm text-foreground">
              Новостей пока нет
            </h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {canCreate
                ? "Нажмите кнопку публикации, чтобы поделиться первой новостью или объявлением с классом."
                : "В этой категории пока нет опубликованных новостей."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const reactionsMap: Record<string, number> = {};
              post.reactions?.forEach((r: any) => {
                reactionsMap[r.emoji] = (reactionsMap[r.emoji] || 0) + 1;
              });

              const isCommentsOpen = openCommentsPostId === post.id;
              let gallery: any = { images: [], files: [] };
              try {
                const parsed = JSON.parse(post.gallery || "{}");
                gallery = Array.isArray(parsed)
                  ? { images: parsed, files: [] }
                  : parsed;
              } catch {}

              return (
                <article key={post.id} className="news-post space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    {post.isPinned ? (
                      <span className="text-xs text-foreground-muted">
                        Закреплённое объявление
                      </span>
                    ) : (
                      <span />
                    )}
                    {canCreate && (
                      <button
                        className="text-xs text-foreground-muted"
                        onClick={async () => {
                          const r = await fetch("/api/news", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              postId: post.id,
                              pinned: !post.isPinned,
                            }),
                          });
                          if (r.ok) fetchPosts();
                          else toast.error("Не удалось закрепить новость");
                        }}
                      >
                        {post.isPinned ? "Открепить" : "Закрепить"}
                      </button>
                    )}
                  </div>
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">
                        {post.author.firstName[0]}
                        {post.author.lastName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {post.author.lastName} {post.author.firstName}
                        </p>
                        <p className="text-[10px] text-foreground-muted">
                          {new Date(post.createdAt).toLocaleDateString(
                            "ru-RU",
                            {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-foreground-muted">
                      {post.category}
                    </span>
                  </div>

                  {post.coverUrl && (
                    <button
                      className="block w-full"
                      aria-label="Открыть фотографию"
                      onClick={() => setViewCover(post.coverUrl)}
                    >
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        loading="lazy"
                        className="w-full max-h-96 object-cover rounded-lg"
                      />
                    </button>
                  )}
                  {gallery.images?.length > 0 && (
                    <div className="media-grid">
                      {gallery.images.map((url: string) => (
                        <button
                          key={url}
                          onClick={() => setViewCover(url)}
                          aria-label="Открыть фотографию"
                        >
                          <img
                            loading="lazy"
                            src={url}
                            alt={post.title}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {gallery.files?.map((a: any) => (
                    <FileCard
                      key={a.fileUrl}
                      name={a.fileName}
                      url={a.fileUrl}
                      size={a.fileSize}
                      mimeType={a.mimeType}
                    />
                  ))}
                  {/* Title & Content */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-foreground leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  {/* Reactions & Comments Bar */}
                  <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJIS.map((emoji) => {
                        const count = reactionsMap[emoji] || 0;
                        const userReacted = post.reactions?.some(
                          (r: any) =>
                            r.emoji === emoji && r.userId === user?.id,
                        );

                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post.id, emoji)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs transition-all ${
                              userReacted
                                ? "bg-accent/20 border border-accent/40 text-foreground scale-105"
                                : "bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && (
                              <span className="text-[11px] font-bold">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {post.allowComments && (
                      <button
                        onClick={() =>
                          setOpenCommentsPostId(isCommentsOpen ? null : post.id)
                        }
                        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-accent transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments?.length || 0} коммент.</span>
                      </button>
                    )}
                  </div>

                  {/* Comment Thread Accordion */}
                  {isCommentsOpen && post.allowComments && (
                    <div className="pt-3 border-t border-border space-y-3 animate-fade-in">
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {post.comments?.length === 0 ? (
                          <p className="text-xs text-foreground-muted py-2 text-center">
                            Пока нет комментариев. Напишите первым!
                          </p>
                        ) : (
                          post.comments.map((comm: any) => (
                            <div
                              key={comm.id}
                              className="p-2.5 rounded-2xl bg-surface-elevated/70 border border-border text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  {comm.author.lastName} {comm.author.firstName}
                                </span>
                                <span className="text-[10px] text-foreground-muted">
                                  {new Date(comm.createdAt).toLocaleDateString(
                                    "ru-RU",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                              <p className="text-foreground-muted leading-relaxed">
                                {comm.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Написать комментарий..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendComment(post.id);
                          }}
                          className="flex-1 bg-surface-elevated border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => handleSendComment(post.id)}
                          className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Create News Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
            <div className="w-full max-w-lg glass-panel rounded-3xl p-6 relative z-10 border border-border-strong ">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-base text-foreground">
                    Новая публикация
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-foreground-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <label className="field">
                  Дополнительные фото и файлы
                  <input
                    type="file"
                    multiple
                    onChange={(e) =>
                      setExtraFiles(Array.from(e.target.files || []))
                    }
                  />
                </label>
                <label className="field">
                  Фотография
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCover(e.target.files?.[0] || null)}
                  />
                </label>
                {submitting && cover && (
                  <p role="status">Загрузка: {coverProgress}%</p>
                )}
                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-accent"
                  >
                    <option value="Объявления">Объявления</option>
                    <option value="Общее">Общее</option>
                    <option value="Мероприятия">Мероприятия</option>
                    <option value="Срочно">Срочно</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Заголовок
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр.: Сбор макулатуры в эту пятницу"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1.5">
                    Текст новости
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Подробный текст сообщения для класса..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowComm"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <label
                    htmlFor="allowComm"
                    className="font-medium text-foreground-muted cursor-pointer"
                  >
                    Разрешить комментарии к этой новости
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all disabled:opacity-50"
                >
                  {submitting ? "Публикация..." : "Опубликовать новость"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      <MediaViewer
        isOpen={!!viewCover}
        onClose={() => setViewCover(null)}
        items={viewCover ? [{ url: viewCover, type: "image" }] : []}
      />
    </AppShell>
  );
}

export default function NewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted">
          Загрузка...
        </div>
      }
    >
      <NewsContent />
    </Suspense>
  );
}
