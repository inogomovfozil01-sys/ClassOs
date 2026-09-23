"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { useSocket } from "@/components/providers/socket-context";
import {
  MessageSquare,
  Plus,
  Search,
  Users,
  Send,
  Paperclip,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  X,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload";
import { VoiceRecorder } from "@/components/messenger/voice-recorder";
import { isVoiceAttachment, voiceDuration } from "@/lib/media";
import { VoicePlayer } from "@/components/messenger/voice-player";
import { AttachmentPreviewComposer } from "@/components/messenger/attachment-preview-composer";
import { MediaViewer } from "@/components/media/media-viewer";
import { MessageActions } from "@/components/messenger/message-actions";
import { Sheet } from "@/components/ui/workspace";
import { FileCard } from "@/components/media/file-card";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "👏"];

export default function ChatsPage() {
  const { user } = useAuth();
  const { socket, onlineUserIds, isConnected } = useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reply, setReply] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [attachmentSheet, setAttachmentSheet] = useState(false);
  const [details, setDetails] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const latestConversation = useRef<string | null>(null);
  latestConversation.current = activeConvId;

  // Voice recording & Attachments
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Media Viewer
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState<any[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // New Chat Modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<
    string[]
  >([]);
  const [newChatType, setNewChatType] = useState<"DIRECT" | "GROUP">("DIRECT");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setReply(null);
    setMessageQuery("");
    setTyping([]);
  }, [activeConvId]);

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const list = data.conversations || [];
        setConversations(list);
        const requested = new URLSearchParams(window.location.search).get(
          "conversation",
        );
        if (requested && list.some((c: any) => c.id === requested)) {
          setActiveConvId(requested);
          return;
        }

        // Auto-select first conversation on desktop if none selected
        if (
          !activeConvId &&
          list.length > 0 &&
          typeof window !== "undefined" &&
          window.innerWidth >= 768
        ) {
          setActiveConvId(list[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_SERVERLESS!=="1")return;
    const timer=setInterval(()=>{if(document.visibilityState!=="visible")return;void fetchConversations();if(activeConvId)void fetchMessages(activeConvId,messageQuery,true)},4000);
    return ()=>clearInterval(timer);
  },[activeConvId,messageQuery]);

  // 2. Fetch Messages when active conversation changes
  const messageRequest = useRef(0);
  const fetchMessages = async (convId: string, query = messageQuery, quiet = false) => {
    const requestId = ++messageRequest.current;
    try {
      if(!quiet)setLoadingMessages(true);
      const res = await fetch(
        `/api/conversations/${convId}/messages${query ? "?q=" + encodeURIComponent(query) : ""}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (
          latestConversation.current !== convId ||
          requestId !== messageRequest.current
        )
          return;
        const incoming = data.messages || [];
        setMessages((previous) => {
          if (!quiet || !incoming.length) return incoming;
          const firstIndex = previous.findIndex((message) => message.id === incoming[0].id);
          return firstIndex > 0 ? [...previous.slice(0, firstIndex), ...incoming] : incoming;
        });
        if (
          !query &&
          data.messages?.length &&
          document.visibilityState === "visible"
        )
          fetch(`/api/conversations/${convId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: data.messages.at(-1).id }),
          }).catch(() => {});
        if (!quiet) setHasMore(Boolean(data.hasMore));
        if (!query && !quiet) scrollToBottom();
      }
    } catch {
      toast.error("Не удалось загрузить сообщения");
    } finally {
      if (requestId === messageRequest.current) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);

      // Join realtime socket room
      if (socket) {
        socket.emit("conversation:join", activeConvId);
      }

      return () => {
        if (socket) {
          socket.emit("conversation:leave", activeConvId);
        }
      };
    }
  }, [activeConvId, socket]);

  useEffect(() => {
    if (!socket || !activeConvId) return;
    const rejoin = () => {
      socket.emit("conversation:join", activeConvId);
      fetchMessages(activeConvId);
    };
    socket.on("connect", rejoin);
    return () => {
      socket.off("connect", rejoin);
    };
  }, [socket, activeConvId]);

  const loadOlder = async () => {
    if (!activeConvId || !messages.length) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/conversations/${activeConvId}/messages?before=${messages[0].id}${messageQuery ? "&q=" + encodeURIComponent(messageQuery) : ""}`,
      );
      if (!res.ok) throw Error();
      const data = await res.json();
      setMessages((prev) => [
        ...data.messages.filter((m: any) => !prev.some((p) => p.id === m.id)),
        ...prev,
      ]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.error("Не удалось загрузить историю");
    } finally {
      setLoadingOlder(false);
    }
  };

  useEffect(() => {
    if (!activeConvId) return;
    const timer = setTimeout(
      () => fetchMessages(activeConvId, messageQuery),
      250,
    );
    return () => clearTimeout(timer);
  }, [messageQuery]);
  useEffect(() => {
    if (!socket) return;
    const updated = (message: any) => {
      if (message.conversationId === activeConvId)
        setMessages((prev) =>
          message.isDeleted
            ? prev.filter((m) => m.id !== message.id)
            : prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
        );
    };
    const read = (event: any) => {
      if (event.conversationId === activeConvId && event.userId !== user?.id)
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            readByOther:
              m.readByOther ||
              (m.senderId === user?.id &&
                new Date(m.createdAt) <= new Date(event.createdAt)),
          })),
        );
    };
    const typingChanged = (event: any) => {
      if (event.conversationId !== activeConvId || event.user?.id === user?.id)
        return;
      const name = event.user?.firstName || event.user?.username || "Участник";
      setTyping((prev) =>
        event.isTyping
          ? Array.from(new Set([...prev, name]))
          : prev.filter((n) => n !== name),
      );
    };
    socket.on("message:updated", updated);
    socket.on("message:read_update", read);
    socket.on("typing:status", typingChanged);
    return () => {
      socket.off("message:updated", updated);
      socket.off("message:read_update", read);
      socket.off("typing:status", typingChanged);
      clearTimeout(typingTimer.current);
    };
  }, [socket, activeConvId, user?.id]);
  function typeMessage(value: string) {
    setMessageInput(value);
    socket?.emit("typing:start", {
      conversationId: activeConvId,
      user: {
        id: user?.id,
        firstName: user?.firstName,
        username: user?.username,
      },
    });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () =>
        socket?.emit("typing:stop", {
          conversationId: activeConvId,
          user: {
            id: user?.id,
            firstName: user?.firstName,
            username: user?.username,
          },
        }),
      1500,
    );
  }
  function pickAttachment(kind: string) {
    setAttachmentSheet(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept =
      kind === "photo" || kind === "camera"
        ? "image/*"
        : kind === "video"
          ? "video/*"
          : "";
    if (kind === "camera") input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  // 3. Socket.IO Listeners for Incoming Realtime Messages & Reactions
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (msg.conversationId === activeConvId) {
        if (document.visibilityState === "visible")
          fetch(`/api/conversations/${activeConvId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id }),
          }).catch(() => {});
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }

      // Update conversation last message in sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: {
                  id: msg.id,
                  content: msg.content,
                  type: msg.type,
                  createdAt: msg.createdAt,
                  senderId: msg.senderId,
                },
              }
            : c,
        ),
      );
    };

    const handleReactionUpdate = (data: any) => {
      if (activeConvId && data.conversationId === activeConvId) {
        fetchMessages(activeConvId);
      }
    };

    socket.on("message:received", handleNewMessage);
    socket.on("reaction:updated", handleReactionUpdate);

    return () => {
      socket.off("message:received", handleNewMessage);
      socket.off("reaction:updated", handleReactionUpdate);
    };
  }, [socket, activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 4. Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;

    const text = messageInput.trim();
    setMessageInput("");

    try {
      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          type: "TEXT",
          replyToId: reply?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReply(null);

      // Optimistic addition
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      scrollToBottom();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 5. Send Staged Attachments from Composer
  const handleSendAttachments = async (caption: string) => {
    if (!stagedFiles.length || !activeConvId) return;

    setUploadingFiles(true);
    try {
      const uploadedAttachments: any[] = [];

      for (const file of stagedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadData = await uploadFile(formData, setUploadProgress);
        {
          uploadedAttachments.push({
            fileName: file.name,
            fileUrl: uploadData.file.downloadUrl,
            fileSize: file.size,
            mimeType: file.type,
          });
        }
      }

      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: caption,
          type: stagedFiles[0]?.type.startsWith("image/") ? "IMAGE" : "FILE",
          attachments: uploadedAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Не удалось отправить сообщение");
      if (res.ok) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message],
        );
        setStagedFiles([]);
        scrollToBottom();
      }
    } catch (err: any) {
      toast.error("Ошибка отправки файлов");
    } finally {
      setUploadingFiles(false);
    }
  };

  // 6. Send Voice Message
  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!activeConvId) return;

    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes("mp4")
        ? "m4a"
        : audioBlob.type.includes("ogg")
          ? "ogg"
          : "webm";
      formData.append("file", audioBlob, `voice-message.${extension}`);

      const uploadRes = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error("Ошибка загрузки голосового");

      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Голосовое сообщение (${duration} сек)`,
          type: "AUDIO_VOICE",
          attachments: [
            {
              fileName: `voice.${extension}`,
              fileUrl: uploadData.file.downloadUrl,
              fileSize: audioBlob.size,
              mimeType: audioBlob.type || "audio/webm",
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Не удалось отправить сообщение");
      if (res.ok) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message],
        );
        setIsRecordingVoice(false);
        scrollToBottom();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 7. Toggle Reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      fetchMessages(activeConvId!);

      if (socket) {
        socket.emit("reaction:toggle", {
          conversationId: activeConvId,
          messageId,
          emoji,
        });
      }
    } catch {
      toast.error("Не удалось поставить реакцию");
    }
  };

  // 8. Open Media in Fullscreen Viewer
  const openMediaViewer = (mediaUrl: string, type: "image" | "video") => {
    // Gather all media from conversation for carousel
    const allMedia: any[] = [];
    messages.forEach((m) => {
      m.attachments?.forEach((att: any) => {
        if (att.mimeType?.startsWith("image/")) {
          allMedia.push({
            url: att.fileUrl,
            type: "image",
            fileName: att.fileName,
            senderName: `${m.sender.lastName} ${m.sender.firstName}`,
            date: new Date(m.createdAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      });
    });

    const targetIdx = allMedia.findIndex((m) => m.url === mediaUrl);
    setViewerMediaList(allMedia);
    setViewerInitialIndex(targetIdx >= 0 ? targetIdx : 0);
    setMediaViewerOpen(true);
  };

  // 9. Start New Chat Dialog
  const openNewChatDialog = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers((data.users || []).filter((u: any) => u.id !== user?.id));
      }
      setIsNewChatOpen(true);
    } catch {
      toast.error("Ошибка получения пользователей");
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsNewChatOpen(false);
      await fetchConversations();
      setActiveConvId(data.conversation.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !selectedGroupMemberIds.length) {
      toast.error("Укажите название группы и выберите участников");
      return;
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          name: groupName.trim(),
          memberIds: selectedGroupMemberIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Групповой чат создан");
      setIsNewChatOpen(false);
      setGroupName("");
      setSelectedGroupMemberIds([]);
      await fetchConversations();
      setActiveConvId(data.conversation.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <AppShell title="Мессенджер класса">
      <div
        className={`messenger flex glass-panel overflow-hidden relative ${activeConvId ? "conversation-open" : ""}`}
      >
        {/* ========================================================
            LEFT COLUMN: CONVERSATION LIST
            ======================================================== */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-surface/60 shrink-0 transition-all ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header & Search */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                <span>Чаты</span>
              </h2>
              <button
                onClick={openNewChatDialog}
                className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-white transition-colors "
                title="Начать новый диалог"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск диалога..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-2xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 custom-scrollbar">
            {loadingConv ? (
              <div className="py-12 text-center text-xs text-foreground-muted">
                Загрузка чатов...
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-foreground-muted px-4">
                У вас пока нет диалогов. Нажмите «+», чтобы написать
                однокласснику или учителю.
              </div>
            ) : (
              conversations
                .filter((c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const isOtherOnline =
                    conv.otherUser && onlineUserIds.has(conv.otherUser.id);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isActive
                          ? "bg-accent/15 border-l-4 border-accent"
                          : "hover:bg-surface-hover/50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs text-accent">
                          {conv.type === "CLASS" ? (
                            <Users className="w-5 h-5 text-accent" />
                          ) : (
                            conv.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        {isOtherOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {conv.name}
                          </p>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-foreground-muted shrink-0 ml-1">
                              {new Date(
                                conv.lastMessage.createdAt,
                              ).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted truncate mt-0.5">
                          {conv.lastMessage
                            ? conv.lastMessage.content
                            : "Нет сообщений"}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="text-[11px] px-2 py-1 bg-accent-muted rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </aside>

        {/* ========================================================
            RIGHT COLUMN: ACTIVE CHAT CONVERSATION
            ======================================================== */}
        <div
          className={`chat-thread flex-1 flex flex-col bg-background/50 ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Top Bar */}
              <div className="h-16 px-4 border-b border-border bg-surface-elevated/40 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs text-accent shrink-0">
                    {activeConversation.type === "CLASS" ? (
                      <Users className="w-4 h-4 text-accent" />
                    ) : (
                      activeConversation.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {activeConversation.name}
                    </h3>
                    <p className="text-[10px] text-foreground-muted">
                      {activeConversation.type === "CLASS"
                        ? "Общий чат класса"
                        : activeConversation.otherUser &&
                            onlineUserIds.has(activeConversation.otherUser.id)
                          ? "В сети"
                          : "Не в сети"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <label className="table-search">
                  <Search size={14} />
                  <input
                    aria-label="Поиск в беседе"
                    placeholder="Поиск в беседе…"
                    value={messageQuery}
                    onChange={(e) => setMessageQuery(e.target.value)}
                  />
                </label>
                <button className="button" onClick={() => setDetails(true)}>
                  Медиа
                </button>
              </div>
              {!isConnected && process.env.NEXT_PUBLIC_SERVERLESS !== "1" && (
                <p role="status" className="text-xs text-warning px-4 py-2">
                  Восстанавливаем соединение…
                </p>
              )}
              {typing.length > 0 && (
                <p className="text-xs text-foreground-muted px-4 py-1">
                  {typing.join(", ")} печатает…
                </p>
              )}
              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {hasMore && (
                  <button
                    className="button mx-auto"
                    disabled={loadingOlder}
                    onClick={loadOlder}
                  >
                    {loadingOlder ? "Загрузка…" : "Более ранние сообщения"}
                  </button>
                )}
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-foreground-muted">
                    Загрузка сообщений...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-foreground-muted">
                    Здесь пока нет сообщений. Напишите первое сообщение!
                  </div>
                ) : (
                  messages.map((msg, messageIndex) => {
                    const isMe = msg.senderId === user?.id;
                    const grouped =
                      messageIndex > 0 &&
                      messages[messageIndex - 1].senderId === msg.senderId &&
                      new Date(msg.createdAt).getTime() -
                        new Date(
                          messages[messageIndex - 1].createdAt,
                        ).getTime() <
                        300000;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}
                      >
                        {!isMe && !grouped && (
                          <span className="text-[10px] font-semibold text-foreground-muted ml-2 mb-0.5">
                            {msg.sender.lastName} {msg.sender.firstName}
                          </span>
                        )}

                        <div
                          className={`message-bubble max-w-[88%] sm:max-w-[70%] rounded-xl px-3 py-2 space-y-2 relative text-xs sm:text-sm leading-relaxed ${
                            isMe
                              ? "bg-accent-muted text-foreground rounded-br-sm"
                              : "glass-panel border border-border text-foreground rounded-bl-sm"
                          }`}
                        >
                          {msg.isForwarded && (
                            <p className="text-[11px] text-foreground-muted">
                              Пересланное сообщение
                            </p>
                          )}
                          {/* Attachments preview */}
                          {msg.attachments?.length > 0 && (
                            <div className="media-grid">
                              {msg.attachments.map((att: any) => {
                                if (isVoiceAttachment(att, msg.type))
                                  return (
                                    <VoicePlayer
                                      key={att.id}
                                      url={att.fileUrl}
                                      initialDuration={voiceDuration(
                                        msg.content,
                                      )}
                                    />
                                  );
                                if (att.mimeType?.startsWith("image/")) {
                                  return (
                                    <div
                                      key={att.id}
                                      onClick={() =>
                                        openMediaViewer(att.fileUrl, "image")
                                      }
                                      className="rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                      <img
                                        src={att.fileUrl}
                                        alt={att.fileName}
                                        loading="lazy"
                                        className="max-h-60 w-full object-cover rounded-xl"
                                      />
                                    </div>
                                  );
                                }
                                if (att.mimeType?.startsWith("video/"))
                                  return (
                                    <button
                                      key={att.id}
                                      type="button"
                                      onClick={() =>
                                        openMediaViewer(att.fileUrl, "video")
                                      }
                                      className="text-left"
                                    >
                                      <video
                                        src={att.fileUrl}
                                        preload="metadata"
                                        className="max-h-60 rounded-xl"
                                      />
                                      <span className="text-xs">
                                        Открыть видео
                                      </span>
                                    </button>
                                  );
                                if (att.mimeType?.startsWith("audio/")) {
                                  return (
                                    <VoicePlayer
                                      key={att.id}
                                      url={att.fileUrl}
                                    />
                                  );
                                }
                                return (
                                  <a
                                    key={att.id}
                                    href={att.fileUrl}
                                    download={att.fileName}
                                    className="flex items-center gap-2 p-2 rounded-xl bg-surface/80 border border-border text-xs font-semibold hover:underline"
                                  >
                                    <FileText className="w-4 h-4 text-accent" />
                                    <span className="truncate">
                                      {att.fileName}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* Text content */}
                          {msg.replyToId && (
                            <div className="border-l-2 border-accent pl-2 text-xs text-foreground-muted">
                              {messages.find((m) => m.id === msg.replyToId)
                                ?.content || "Ответ на сообщение"}
                            </div>
                          )}
                          {msg.content &&
                            !(
                              msg.type === "AUDIO_VOICE" &&
                              voiceDuration(msg.content) >= 0 &&
                              /^Голосовое сообщение/.test(msg.content)
                            ) && (
                              <p className="whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}

                          {/* Time & Read receipts */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] ${"text-foreground-muted"}`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString(
                                "ru-RU",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            {msg.editedAt && <span>изменено</span>}
                            {isMe &&
                              (msg.readByOther ? (
                                <CheckCheck
                                  aria-label="Прочитано"
                                  className="w-3 h-3 text-success"
                                />
                              ) : (
                                <Check
                                  aria-label="Отправлено"
                                  className="w-3 h-3 text-foreground-muted"
                                />
                              ))}
                          </div>
                        </div>

                        {/* Reactions Bar */}
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <MessageActions
                            message={msg}
                            isOwn={isMe}
                            conversations={conversations}
                            onReply={() => setReply(msg)}
                            onUpdate={() =>
                              activeConvId && fetchMessages(activeConvId)
                            }
                          />
                          <button
                            className="text-[11px] text-foreground-muted px-2 py-1"
                            onClick={() => setReply(msg)}
                          >
                            Ответить
                          </button>
                          {msg.reactions?.map((r: any) => (
                            <span
                              key={r.id}
                              className="text-[11px] px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border"
                            >
                              {r.emoji}
                            </span>
                          ))}
                          <div className="message-reactions transition-opacity flex items-center gap-1">
                            {EMOJIS.slice(0, 3).map((e) => (
                              <button
                                key={e}
                                onClick={() => handleReaction(msg.id, e)}
                                className="text-xs hover:scale-125 transition-transform"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer & Audio / Attachment Preview */}
              <div className="p-3 border-t border-border bg-surface-elevated/40 backdrop-blur-md">
                {reply && (
                  <div className="flex items-center gap-2 border-l-2 border-accent pl-3 mb-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <strong>Ответ на сообщение</strong>
                      <p className="truncate text-foreground-muted">
                        {reply.content}
                      </p>
                    </div>
                    <button
                      aria-label="Отменить ответ"
                      className="icon-button"
                      onClick={() => setReply(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {/* File Composer Preview if files chosen */}
                {stagedFiles.length > 0 && (
                  <AttachmentPreviewComposer
                    files={stagedFiles}
                    onRemoveFile={(idx) =>
                      setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                    onSend={handleSendAttachments}
                    onCancel={() => setStagedFiles([])}
                    uploading={uploadingFiles}
                    progress={uploadProgress}
                  />
                )}

                {/* Voice message recorder */}
                {isRecordingVoice ? (
                  <VoiceRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setStagedFiles((prev) => [
                            ...prev,
                            ...Array.from(e.target.files || []),
                          ]);
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => setAttachmentSheet(true)}
                      className="p-2.5 rounded-2xl bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
                      title="Прикрепить файл или фото"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      hidden={!!messageInput.trim()}
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-2xl bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
                      title="Записать голосовое сообщение"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder="Напишите сообщение..."
                      value={messageInput}
                      onChange={(e) => typeMessage(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors "
                    />

                    <button
                      type="submit"
                      hidden={!messageInput.trim()}
                      disabled={!messageInput.trim()}
                      aria-label="Отправить сообщение"
                      className="p-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white disabled:opacity-40 transition-all "
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-surface-elevated border border-border flex items-center justify-center text-accent">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                Выберите диалог
              </h3>
              <p className="text-xs text-foreground-muted max-w-sm">
                Выберите чат из списка слева или начните новый разговор с
                одноклассником или учителем.
              </p>
              <button
                onClick={openNewChatDialog}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all"
              >
                + Начать новый диалог
              </button>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={attachmentSheet}
        onOpenChange={setAttachmentSheet}
        title="Добавить вложение"
      >
        <div className="message-action-list">
          {[
            ["camera", "Камера"],
            ["photo", "Фото"],
            ["video", "Видео"],
            ["file", "Файл"],
          ].map(([kind, label]) => (
            <button key={kind} onClick={() => pickAttachment(kind)}>
              {label}
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet
        open={details}
        onOpenChange={setDetails}
        title="Материалы беседы"
        description="Из загруженной истории. Более ранние сообщения доступны в беседе."
      >
        <div className="space-y-3">
          {messages
            .flatMap((m) => m.attachments || [])
            .map((a: any) => (
              <FileCard
                key={a.id}
                name={a.fileName}
                url={a.fileUrl}
                size={a.fileSize}
                mimeType={a.mimeType}
              />
            ))}
          {!messages.some((m) => m.attachments?.length) && (
            <p className="text-xs text-foreground-muted">Вложений пока нет.</p>
          )}
        </div>
      </Sheet>
      {/* Fullscreen Media Viewer */}
      <MediaViewer
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
        items={viewerMediaList}
        initialIndex={viewerInitialIndex}
      />

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsNewChatOpen(false)}
          />
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 relative z-10 border border-border-strong  max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-base text-foreground">
                Новый разговор
              </h3>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="p-1 rounded-full text-foreground-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setNewChatType("DIRECT")}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  newChatType === "DIRECT"
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface-elevated text-foreground-muted"
                }`}
              >
                Личный диалог
              </button>
              <button
                onClick={() => setNewChatType("GROUP")}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  newChatType === "GROUP"
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface-elevated text-foreground-muted"
                }`}
              >
                Групповой чат
              </button>
            </div>

            {newChatType === "DIRECT" ? (
              <div className="space-y-2">
                <p className="text-xs text-foreground-muted mb-2">
                  Выберите собеседника:
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleStartDirectChat(u.id)}
                      className="p-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover cursor-pointer border border-border transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-xs text-foreground">
                          {u.lastName} {u.firstName}
                        </p>
                        <p className="text-[10px] text-foreground-muted">
                          @{u.username} • {u.role}
                        </p>
                      </div>
                      <span className="text-xs text-accent font-semibold">
                        Написать →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleCreateGroupChat}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Название группы
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="напр.: Проект по физике"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-foreground-muted mb-1">
                    Выберите участников
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-2xl bg-surface-elevated border border-border custom-scrollbar">
                    {allUsers.map((u) => {
                      const isSelected = selectedGroupMemberIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedGroupMemberIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id],
                            );
                          }}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-accent/20 border border-accent/40 text-foreground font-semibold"
                              : "hover:bg-surface-hover text-foreground-muted"
                          }`}
                        >
                          <span>
                            {u.lastName} {u.firstName}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold  transition-all"
                >
                  Создать групповой чат
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
