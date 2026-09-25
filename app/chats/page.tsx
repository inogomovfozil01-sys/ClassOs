"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserProfileModal } from "@/components/profile/user-profile-modal";
import Link from "next/link";

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
  Settings,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  LogOut,
  Eye,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react";
import { isLeaderOrHigher, isAdminOrOwner } from "@/lib/auth/rbac";
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
import {
  playNotificationSound,
  requestNotificationPermission,
  getNotificationPermission,
  sendChatPushNotification,
  getMutedConversations,
  setConversationMuted,
} from "@/lib/chat-notifications";

import { ExpressionPicker } from "@/components/messenger/expression-picker";
import { getSticker } from "@/lib/chat-expressions";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "👏"];

function areConversationsEqual(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (itemA.id !== itemB.id) return false;
    if (itemA.unreadCount !== itemB.unreadCount) return false;
    if (itemA.name !== itemB.name) return false;
    if (itemA.lastMessage?.id !== itemB.lastMessage?.id) return false;
    if (itemA.lastMessage?.createdAt !== itemB.lastMessage?.createdAt) return false;
    if (itemA.lastMessage?.content !== itemB.lastMessage?.content) return false;
    if (itemA.lastMessage?.isRead !== itemB.lastMessage?.isRead) return false;
    if (itemA.otherUser?.isOnline !== itemB.otherUser?.isOnline) return false;
    if (itemA.otherUser?.lastSeenAt !== itemB.otherUser?.lastSeenAt) return false;
  }
  return true;
}

export default function ChatsPage() {
  const { user } = useAuth();
  const {
    socket,
    onlineUserIds,
    isConnected,
    isUserOnline,
    getUserLastSeen,
  } = useSocket();

  const messageCacheRef = useRef<Map<string, any[]>>(new Map());

  const getCachedMessages = (convId: string): any[] => {
    if (messageCacheRef.current.has(convId)) {
      return messageCacheRef.current.get(convId)!;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`classos_chat_msgs_${convId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            messageCacheRef.current.set(convId, parsed);
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  };

  const setCachedMessages = (convId: string, msgs: any[]) => {
    messageCacheRef.current.set(convId, msgs);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `classos_chat_msgs_${convId}`,
          JSON.stringify(msgs.slice(-50)),
        );
      } catch {}
    }
  };

  const [conversations, setConversations] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("classos_chat_conversations");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const param = new URLSearchParams(window.location.search).get("conversation");
        if (param) return param;
        const saved = sessionStorage.getItem("classos_chat_active_conv");
        if (saved) return saved;
      } catch {}
    }
    return null;
  });
  const [messages, setMessages] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const param = new URLSearchParams(window.location.search).get("conversation");
        const savedId = param || sessionStorage.getItem("classos_chat_active_conv");
        if (savedId) {
          const raw = sessionStorage.getItem(`classos_chat_msgs_${savedId}`);
          if (raw) return JSON.parse(raw);
        }
      } catch {}
    }
    return [];
  });
  const [messageInput, setMessageInput] = useState("");
  const [expressionsOpen, setExpressionsOpen] = useState(false);
  const [sendingSticker, setSendingSticker] = useState(false);
  const stickerLock = useRef(false);
  const composerRef = useRef<HTMLInputElement>(null);
  const [loadingConv, setLoadingConv] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("classos_chat_conversations");
        if (raw && JSON.parse(raw)?.length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reply, setReply] = useState<any>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatFilter, setChatFilter] = useState<"ALL" | "CLASS" | "DIRECT">("ALL");
  const [messageQuery, setMessageQuery] = useState("");
  const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);
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

  // Group Settings & Management
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [renamingGroup, setRenamingGroup] = useState(false);

  // Message viewers & reactions detail
  const [readersModalMsg, setReadersModalMsg] = useState<any>(null);
  const [reactionDetailModal, setReactionDetailModal] = useState<{
    emoji: string;
    users: any[];
  } | null>(null);

  // Chat Notifications & Push
  const [mutedConvIds, setMutedConvIds] = useState<Set<string>>(() =>
    getMutedConversations(user?.id),
  );
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );
  const [chatSoundEnabled, setChatSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("classos_chat_sound_enabled");
      return v === null ? true : v === "1";
    }
    return true;
  });
  const [chatPushEnabled, setChatPushEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("classos_chat_push_enabled");
      return v === null ? true : v === "1";
    }
    return true;
  });

  useEffect(() => {
    if (user?.id) {
      setMutedConvIds(getMutedConversations(user.id));
    }
  }, [user?.id]);

  const formatUserStatus = (otherUser: any) => {
    if (!otherUser) return "Не в сети";
    const isOnline =
      isUserOnline(otherUser.id) ||
      (otherUser.id && onlineUserIds.has(otherUser.id));
    if (isOnline) return "В сети";

    const lastSeenRaw = getUserLastSeen(otherUser.id) || otherUser.lastSeenAt;
    if (!lastSeenRaw) return "Не в сети";

    const date = new Date(lastSeenRaw);
    if (isNaN(date.getTime())) return "Не в сети";

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 90) return "В сети";
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `Был(а) в сети ${mins} мин. назад`;
    }
    const timeStr = date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (date.toDateString() === now.toDateString()) {
      return `Был(а) в сети сегодня в ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Был(а) в сети вчера в ${timeStr}`;
    }
    return `Был(а) в сети ${date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} в ${timeStr}`;
  };

  const moveConversationToTop = (
    convId: string,
    lastMsg: any,
    incrementUnread = false,
  ) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === convId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const updated = {
        ...target,
        unreadCount: incrementUnread
          ? (target.unreadCount || 0) + 1
          : target.unreadCount,
        lastMessage: {
          id: lastMsg.id,
          content: lastMsg.content,
          type: lastMsg.type || "TEXT",
          createdAt: lastMsg.createdAt || new Date().toISOString(),
          senderId: lastMsg.senderId,
          isRead:
            lastMsg.isRead ?? (lastMsg.senderId === user?.id ? false : true),
        },
      };
      const remaining = prev.filter((c) => c.id !== convId);
      return [updated, ...remaining];
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const requestedConvHandled = useRef(false);
  const lastMarkedReadId = useRef<string | null>(null);

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const scrollToBottom = (force = false) => {
    setTimeout(() => {
      if (force || isNearBottom()) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };
  useEffect(() => {
    setReply(null);
    setMessageQuery("");
    setTyping([]);
  }, [activeConvId]);

  // 1. Fetch Conversations
  const fetchConversations = async (quiet = false) => {
    try {
      if (!quiet && conversations.length === 0) setLoadingConv(true);
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        const list = (data.conversations || []).sort((a: any, b: any) => {
          const timeA = a.lastMessage
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const timeB = b.lastMessage
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return timeB - timeA;
        });
        setConversations((prev) =>
          areConversationsEqual(prev, list) ? prev : list,
        );
        if (!requestedConvHandled.current) {
          const requested = new URLSearchParams(window.location.search).get(
            "conversation",
          );
          if (requested && list.some((c: any) => c.id === requested)) {
            requestedConvHandled.current = true;
            setActiveConvId(requested);
            return;
          }
          requestedConvHandled.current = true;
        }

        // Auto-select first conversation on desktop if none selected
        if (
          !activeConvId &&
          list.length > 0 &&
          typeof window !== "undefined" &&
          window.innerWidth >= 768
        ) {
          const savedId = sessionStorage.getItem("classos_chat_active_conv");
          if (savedId && list.some((c: any) => c.id === savedId)) {
            setActiveConvId(savedId);
          } else {
            setActiveConvId(list[0].id);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      if (!quiet) setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(()=>{
    const shouldPoll =
      process.env.NEXT_PUBLIC_SERVERLESS === "1" || !isConnected;
    if (!shouldPoll) return;
    const timer=setInterval(()=>{if(document.visibilityState!=="visible")return;void fetchConversations(true);if(activeConvId)void fetchMessages(activeConvId,messageQuery,true)},2500);
    return ()=>clearInterval(timer);
  },[activeConvId,messageQuery,isConnected]);

  // 2. Fetch Messages when active conversation changes
  const messageRequest = useRef(0);
  const fetchMessages = async (convId: string, query = messageQuery, quiet = false) => {
    const requestId = ++messageRequest.current;
    try {
      if (!quiet) setLoadingMessages(true);
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

        // Filter out any messages deleted for me locally
        let deletedForMe = new Set<string>();
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(`classos_deleted_for_me_${user?.id}`);
            if (raw) deletedForMe = new Set(JSON.parse(raw));
          } catch {}
        }

        const incoming = (data.messages || []).filter(
          (m: any) => !deletedForMe.has(m.id),
        );
        setCachedMessages(convId, incoming);

        setMessages((previous) => {
          if (!incoming.length) return quiet ? previous : [];
          if (!previous.length) return incoming;

          const firstIncoming = incoming[0];
          const sliceIndex = previous.findIndex(
            (m) => m.id === firstIncoming.id,
          );
          const oldPrefix =
            sliceIndex > 0 ? previous.slice(0, sliceIndex) : [];
          const currentTail =
            sliceIndex >= 0 ? previous.slice(sliceIndex) : previous;

          let tailChanged = currentTail.length !== incoming.length;
          const mergedTail = incoming.map((incMsg: any, idx: number) => {
            const prevMsg = currentTail[idx];
            if (
              prevMsg &&
              prevMsg.id === incMsg.id &&
              prevMsg.content === incMsg.content &&
              prevMsg.readByOther === incMsg.readByOther &&
              prevMsg.isDeleted === incMsg.isDeleted &&
              (prevMsg.reactions?.length || 0) ===
                (incMsg.reactions?.length || 0) &&
              (prevMsg.attachments?.length || 0) ===
                (incMsg.attachments?.length || 0) &&
              (prevMsg.readByUsers?.length || 0) ===
                (incMsg.readByUsers?.length || 0)
            ) {
              return prevMsg;
            }
            tailChanged = true;
            return incMsg;
          });

          if (
            !tailChanged &&
            oldPrefix.length + currentTail.length === previous.length
          ) {
            return previous;
          }

          return [...oldPrefix, ...mergedTail];
        });
        if (
          !query &&
          data.messages?.length &&
          document.visibilityState === "visible"
        ) {
          const lastMsg = data.messages.at(-1);
          if (lastMsg && lastMarkedReadId.current !== `${convId}:${lastMsg.id}`) {
            lastMarkedReadId.current = `${convId}:${lastMsg.id}`;
            fetch(`/api/conversations/${convId}/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messageId: data.messages.at(-1).id }),
            }).catch(() => {});
          }
        }
        if (!quiet) setHasMore(Boolean(data.hasMore));
        if (!query && !quiet) scrollToBottom(true);
      }
    } catch {
      if (!quiet) toast.error("Не удалось загрузить сообщения");
    } finally {
      if (requestId === messageRequest.current && !quiet) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("classos_chat_active_conv", activeConvId);
      }
      const cached = getCachedMessages(activeConvId);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLoadingMessages(false);
        lastMarkedReadId.current = null;
        fetchMessages(activeConvId, "", true);
      } else {
        setMessages([]);
        setLoadingMessages(true);
        lastMarkedReadId.current = null;
        fetchMessages(activeConvId, "", false);
      }

      // Fetch group details quietly
      fetch(`/api/conversations/${activeConvId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          if (d?.conversation) {
            setGroupDetails(d.conversation);
            setEditingGroupName(d.conversation.name || "");
          }
        })
        .catch(() => {});

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
      fetchMessages(activeConvId, messageQuery, true);
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
      () => fetchMessages(activeConvId, messageQuery, true),
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
      const isCurrentActive = msg.conversationId === activeConvId;
      if (isCurrentActive) {
        if (document.visibilityState === "visible") {
          fetch(`/api/conversations/${activeConvId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id }),
          }).catch(() => {});
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === user?.id || isNearBottom()) {
          scrollToBottom(true);
        }
      }

      // Move conversation with new message to the very top
      moveConversationToTop(msg.conversationId, msg, !isCurrentActive);

      // Sound & Push notifications
      if (msg.senderId !== user?.id && !mutedConvIds.has(msg.conversationId)) {
        if (chatSoundEnabled) {
          playNotificationSound();
        }
        if (document.visibilityState !== "visible" || !isCurrentActive) {
          if (chatPushEnabled) {
            const senderName = msg.sender
              ? `${msg.sender.firstName} ${msg.sender.lastName || ""}`.trim()
              : "Новое сообщение";
            sendChatPushNotification({
              title: senderName,
              body:
                msg.content ||
                (msg.type === "IMAGE"
                  ? "Фотография"
                  : msg.type === "AUDIO_VOICE"
                    ? "Голосовое сообщение"
                    : "Вложение"),
              url: `/chats?conversation=${msg.conversationId}`,
            });
          }
        }
      }
    };

    const handleReactionUpdate = (data: any) => {
      if (activeConvId && data.conversationId === activeConvId) {
        fetchMessages(activeConvId, messageQuery, true);
      }
    };

    socket.on("message:received", handleNewMessage);
    socket.on("reaction:updated", handleReactionUpdate);

    return () => {
      socket.off("message:received", handleNewMessage);
      socket.off("reaction:updated", handleReactionUpdate);
    };
  }, [
    socket,
    activeConvId,
    messageQuery,
    user?.id,
    mutedConvIds,
    chatSoundEnabled,
    chatPushEnabled,
  ]);

  // 4. Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;

    const text = messageInput.trim();
    setMessageInput("");

    // Optimistic message addition for 0ms delay
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: any = {
      id: tempId,
      conversationId: activeConvId,
      senderId: user?.id,
      sender: {
        id: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        avatarUrl: user?.avatarUrl,
        role: user?.role,
      },
      content: text,
      type: "TEXT",
      replyToId: reply?.id,
      createdAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      readByUsers: [],
      readByOther: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    // Optimistically bring current chat to the top
    moveConversationToTop(activeConvId, {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      senderId: user?.id,
      isRead: false,
    });

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

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m)),
      );
      moveConversationToTop(activeConvId, data.message, false);
      scrollToBottom(true);
    } catch (err: any) {
      toast.error(err.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleSendSticker = async (content: string) => {
    if (!activeConvId || stickerLock.current) return;
    const conversationId = activeConvId;
    stickerLock.current = true;
    setSendingSticker(true);
    try {
      const res = await fetch('/api/conversations/' + conversationId + '/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'STICKER', content, replyToId: reply?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось отправить стикер');
      if (latestConversation.current === conversationId) {
        setMessages(prev => prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        setReply(null);
        scrollToBottom(true);
      }
      moveConversationToTop(conversationId, data.message, false);
      setExpressionsOpen(false);
    } catch (error: any) { toast.error(error.message); }
    finally { stickerLock.current = false; setSendingSticker(false); }
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
        moveConversationToTop(activeConvId, data.message, false);
        setStagedFiles([]);
        scrollToBottom(true);
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
        moveConversationToTop(activeConvId, data.message, false);
        setIsRecordingVoice(false);
        scrollToBottom(true);
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
      fetchMessages(activeConvId!, messageQuery, true);

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
      await fetchConversations(true);
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
      await fetchConversations(true);
      setActiveConvId(data.conversation.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const isConvAdmin = Boolean(
    activeConversation?.createdById === user?.id ||
    groupDetails?.createdById === user?.id ||
    groupDetails?.members?.some(
      (m: any) => m.userId === user?.id && m.role === "ADMIN",
    ) ||
    isAdminOrOwner(user?.role) ||
    isLeaderOrHigher(user?.role),
  );

  const availableUsersToAdd = allUsers.filter(
    (u) =>
      !groupDetails?.members?.some((m: any) => m.userId === u.id) &&
      (!addMemberSearch.trim() ||
        `${u.firstName} ${u.lastName} ${u.username}`
          .toLowerCase()
          .includes(addMemberSearch.toLowerCase())),
  );

  const openGroupSettings = async () => {
    if (!activeConvId) return;
    setGroupSettingsOpen(true);
    setLoadingGroupDetails(true);
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`);
      if (res.ok) {
        const d = await res.json();
        setGroupDetails(d.conversation);
        setEditingGroupName(d.conversation.name || "");
      }
    } catch {
      toast.error("Не удалось загрузить настройки группы");
    } finally {
      setLoadingGroupDetails(false);
    }
  };

  const handleRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupName.trim() || !activeConvId) return;
    setRenamingGroup(true);
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name: editingGroupName.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setGroupDetails((prev: any) => ({ ...prev, name: editingGroupName.trim() }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, name: editingGroupName.trim() } : c,
        ),
      );
      toast.success("Название группы обновлено");
    } catch (err: any) {
      toast.error(err.message || "Ошибка переименования");
    } finally {
      setRenamingGroup(false);
    }
  };

  const handleAddMemberToGroup = async (userId: string) => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_member", userId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Участник добавлен");
      setIsAddMemberOpen(false);
      openGroupSettings();
      fetchConversations(true);
    } catch (err: any) {
      toast.error(err.message || "Ошибка добавления");
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string) => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_member", userId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (userId === user?.id) {
        toast.success("Вы покинули группу");
        setGroupSettingsOpen(false);
        setActiveConvId(null);
        fetchConversations(true);
      } else {
        toast.success("Участник удалён");
        openGroupSettings();
        fetchConversations(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Ошибка удаления");
    }
  };

  const handleSetMemberRole = async (userId: string, role: "ADMIN" | "MEMBER") => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", userId, role }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(
        role === "ADMIN" ? "Права администратора выданы" : "Права администратора сняты",
      );
      openGroupSettings();
    } catch (err: any) {
      toast.error(err.message || "Ошибка смены роли");
    }
  };

  const getGroupedReactions = (reactions: any[] = []) => {
    const map = new Map<string, { emoji: string; count: number; users: any[]; hasMine: boolean }>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) {
        map.set(r.emoji, { emoji: r.emoji, count: 0, users: [], hasMine: false });
      }
      const entry = map.get(r.emoji)!;
      entry.count += 1;
      if (r.user) entry.users.push(r.user);
      if (r.userId === user?.id) entry.hasMine = true;
    }
    return Array.from(map.values());
  };

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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setNotifSettingsOpen(true)}
                  className="p-2 rounded-2xl bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-all border border-border shadow-xs"
                  title="Настройки уведомлений на телефоне и звуков"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={openNewChatDialog}
                  className="p-2 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white transition-all shadow-xs"
                  title="Начать новый диалог"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск диалога..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-2xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent shadow-xs transition-colors"
              />
            </div>

            {/* Folder / Category pills (Telegram style) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-elevated/70 border border-border">
              <button
                type="button"
                onClick={() => setChatFilter("ALL")}
                className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-all ${
                  chatFilter === "ALL"
                    ? "bg-accent text-white shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setChatFilter("CLASS")}
                className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-all ${
                  chatFilter === "CLASS"
                    ? "bg-accent text-white shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Класс
              </button>
              <button
                type="button"
                onClick={() => setChatFilter("DIRECT")}
                className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-all ${
                  chatFilter === "DIRECT"
                    ? "bg-accent text-white shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Личные
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto py-2 px-1 space-y-1 custom-scrollbar">
            {loadingConv && conversations.length === 0 ? (
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
                .filter((c) => {
                  if (chatFilter === "CLASS") return c.type === "CLASS" || c.type === "GROUP";
                  if (chatFilter === "DIRECT") return c.type === "DIRECT";
                  return true;
                })
                .map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const isOtherOnline =
                    conv.otherUser &&
                    (isUserOnline(conv.otherUser.id) ||
                      onlineUserIds.has(conv.otherUser.id));
                  const isLastMessageMe =
                    conv.lastMessage?.senderId === user?.id;
                  const isMuted = mutedConvIds.has(conv.id);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`mx-1 p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-accent/15 border border-accent/30 shadow-sm"
                          : "hover:bg-surface-elevated/70 border border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-11 h-11 rounded-2xl overflow-hidden border flex items-center justify-center font-bold text-xs ${
                            isActive
                              ? "border-accent/40 bg-accent/20 text-accent"
                              : "border-border bg-surface-elevated text-accent"
                          }`}
                        >
                          {conv.type === "CLASS" ? (
                            <Users className="w-5 h-5 text-accent" />
                          ) : (
                            <UserAvatar
                              src={conv.avatarUrl}
                              name={conv.name}
                              size={44}
                            />
                          )}
                        </div>
                        {isOtherOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface shadow-xs animate-pulse" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {conv.name}
                            </p>
                            {isMuted && (
                              <span title="Уведомления отключены">
                                <BellOff className="w-3 h-3 text-foreground-muted shrink-0" />
                              </span>
                            )}
                          </div>
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
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {isLastMessageMe && conv.lastMessage && (
                              conv.lastMessage.isRead ? (
                                <span title="Прочитано">
                                  <CheckCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                                </span>
                              ) : (
                                <span title="Отправлено">
                                  <Check className="w-3 h-3 text-foreground-muted shrink-0" />
                                </span>
                              )
                            )}
                            <p
                              className={`text-[11px] truncate ${
                                conv.unreadCount > 0
                                  ? "font-medium text-foreground"
                                  : "text-foreground-muted"
                              }`}
                            >
                              {isLastMessageMe && (
                                <span className="text-foreground-muted/80">
                                  Вы:{" "}
                                </span>
                              )}
                              {conv.lastMessage
                                ? conv.lastMessage.content
                                : "Нет сообщений"}
                            </p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-accent text-white rounded-full min-w-[18px] text-center shrink-0 shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
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
              <div className="chat-heading px-4 border-b border-border bg-surface-elevated/60 backdrop-blur-xl shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="md:hidden p-2 rounded-2xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div
                    className={`relative shrink-0 ${activeConversation.otherUser?.id ? "cursor-pointer hover:opacity-85 transition-opacity" : ""}`}
                    onClick={() => {
                      if (activeConversation.otherUser?.id) {
                        setSelectedProfileUserId(activeConversation.otherUser.id);
                      }
                    }}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent/20 to-purple-500/20 border border-border flex items-center justify-center font-bold text-xs text-accent">
                      {activeConversation.type === "CLASS" ? (
                        <Users className="w-5 h-5 text-accent" />
                      ) : (
                        <UserAvatar
                          src={activeConversation.avatarUrl}
                          name={activeConversation.name}
                          size={40}
                        />
                      )}
                    </div>
                    {isUserOnline(activeConversation.otherUser?.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-surface animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {activeConversation.otherUser?.id ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProfileUserId(activeConversation.otherUser.id)}
                          className="hover:underline hover:text-accent transition-colors text-left font-bold"
                          title="Открыть профиль"
                        >
                          {activeConversation.name}
                        </button>
                      ) : (
                        activeConversation.name
                      )}
                    </h3>
                    <p className="text-[11px] text-foreground-muted flex items-center gap-1.5 mt-0.5 break-words">
                      {activeConversation.type === "CLASS" ? (
                        "Общий чат 7-«Б» класса"
                      ) : activeConversation.type === "GROUP" ? (
                        `${groupDetails?.members?.length || activeConversation.membersCount || 0} участников`
                      ) : (
                        <>
                          {(isUserOnline(activeConversation.otherUser?.id) ||
                            (activeConversation.otherUser?.id &&
                              onlineUserIds.has(
                                activeConversation.otherUser.id,
                              ))) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block shrink-0" />
                          )}
                          <span>
                            {formatUserStatus(activeConversation.otherUser)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="chat-heading-actions">
                  {/* Toggle in-chat Search */}
                  <button
                    type="button"
                    onClick={() => setIsMsgSearchOpen(!isMsgSearchOpen)}
                    className={`p-2 rounded-2xl transition-all border ${
                      isMsgSearchOpen
                        ? "bg-accent text-white border-accent shadow-xs"
                        : "bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground border-border"
                    }`}
                    title="Поиск сообщений в чате"
                  >
                    <Search size={15} />
                  </button>

                  {/* Mute/Unmute Chat Notifications */}
                  <button
                    type="button"
                    className={`p-2 rounded-2xl transition-all border ${
                      mutedConvIds.has(activeConversation.id)
                        ? "text-warning border-warning/40 bg-warning/10"
                        : "bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground border-border"
                    }`}
                    onClick={() => {
                      const nextMuted = !mutedConvIds.has(activeConversation.id);
                      const updated = setConversationMuted(
                        user?.id || "",
                        activeConversation.id,
                        nextMuted,
                      );
                      setMutedConvIds(new Set(updated));
                      toast.success(
                        nextMuted
                          ? "Уведомления этого чата отключены"
                          : "Уведомления этого чата включены",
                      );
                    }}
                    title={
                      mutedConvIds.has(activeConversation.id)
                        ? "Уведомления отключены (нажмите, чтобы включить)"
                        : "Уведомления включены (нажмите, чтобы отключить)"
                    }
                  >
                    {mutedConvIds.has(activeConversation.id) ? (
                      <BellOff size={15} />
                    ) : (
                      <Bell size={15} />
                    )}
                  </button>

                  {activeConversation.type === "GROUP" && (
                    <button
                      type="button"
                      className="p-2 rounded-2xl bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-all border border-border"
                      onClick={openGroupSettings}
                      title="Настройки группы и участники"
                    >
                      <Settings size={15} />
                    </button>
                  )}

                  <button
                    className="px-3 py-2 rounded-2xl bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground text-xs font-semibold border border-border transition-all"
                    onClick={() => setDetails(true)}
                  >
                    Медиа
                  </button>
                </div>
              </div>

              {/* Collapsible In-Chat Search Drawer */}
              {isMsgSearchOpen && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-elevated/70 backdrop-blur-md animate-fade-in">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Поиск по сообщениям в чате…"
                      value={messageQuery}
                      onChange={(e) => setMessageQuery(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent"
                      autoFocus
                    />
                    {messageQuery && (
                      <button
                        type="button"
                        onClick={() => setMessageQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMsgSearchOpen(false);
                      setMessageQuery("");
                    }}
                    className="text-xs text-foreground-muted hover:text-foreground font-semibold px-2 py-1"
                  >
                    Закрыть
                  </button>
                </div>
              )}
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
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
              >
                {hasMore && (
                  <button
                    className="button mx-auto"
                    disabled={loadingOlder}
                    onClick={loadOlder}
                  >
                    {loadingOlder ? "Загрузка…" : "Более ранние сообщения"}
                  </button>
                )}
                {loadingMessages && messages.length === 0 ? (
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
                    const sticker = msg.type === "STICKER" ? getSticker(msg.content) : undefined;
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
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} group my-1`}
                      >
                        {!isMe && !grouped && (
                          <div className="flex items-center gap-1.5 ml-2 mb-1">
                            <button
                              type="button"
                              onClick={() => setSelectedProfileUserId(msg.senderId)}
                              className="text-[11px] font-bold text-accent hover:underline text-left cursor-pointer"
                              title="Посмотреть профиль"
                            >
                              {msg.sender.lastName} {msg.sender.firstName}
                            </button>
                            {msg.sender.role && msg.sender.role !== "STUDENT" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                                {msg.sender.role === "OWNER"
                                  ? "Создатель"
                                  : msg.sender.role === "ADMIN"
                                    ? "Админ"
                                    : msg.sender.role === "LEADER"
                                      ? "Лидер"
                                      : "Учитель"}
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          className={`message-bubble ${sticker ? "sticker-message" : ""} max-w-[88%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 space-y-2 relative text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                            isMe
                              ? "bg-gradient-to-br from-accent via-accent to-accent-hover text-white rounded-tr-xs shadow-md shadow-accent/15"
                              : "glass-panel bg-surface-elevated/90 border border-border text-foreground rounded-tl-xs backdrop-blur-md"
                          }`}
                        >
                          {msg.isForwarded && (
                            <p
                              className={`text-[11px] ${
                                isMe ? "text-white/80" : "text-foreground-muted"
                              }`}
                            >
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
                                        className="max-h-64 w-full object-cover rounded-xl"
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
                                        className="max-h-64 rounded-xl"
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
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold hover:underline transition-colors ${
                                      isMe
                                        ? "bg-white/15 border-white/20 text-white"
                                        : "bg-surface/80 border-border text-foreground"
                                    }`}
                                  >
                                    <FileText
                                      className={`w-4 h-4 shrink-0 ${isMe ? "text-white" : "text-accent"}`}
                                    />
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
                            <div
                              className={`border-l-2 p-2 rounded-r-xl text-xs ${
                                isMe
                                  ? "border-white/80 bg-white/10 text-white/95"
                                  : "border-accent bg-accent/10 text-foreground-muted"
                              }`}
                            >
                              <span
                                className={`block font-semibold text-[10px] ${
                                  isMe ? "text-white" : "text-accent"
                                }`}
                              >
                                Ответ
                              </span>
                              <p className="truncate text-[11px]">
                                {messages.find((m) => m.id === msg.replyToId)
                                  ?.content || "Сообщение"}
                              </p>
                            </div>
                          )}
                          {sticker && <img className="chat-sticker" src={`/stickers/${sticker.id}.svg`} alt={sticker.label} width={180} height={180} />}
                          {msg.content && !sticker &&
                            !(
                              msg.type === "AUDIO_VOICE" &&
                              voiceDuration(msg.content) >= 0 &&
                              /^Голосовое сообщение/.test(msg.content)
                            ) && (
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                              </p>
                            )}

                          {/* Time & Read receipts */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isMe ? "text-white/80" : "text-foreground-muted"
                            }`}
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
                            {msg.editedAt && (
                              <span className="opacity-80">изменено</span>
                            )}
                            {isMe &&
                              (msg.readByOther ||
                              (msg.readByUsers &&
                                msg.readByUsers.length > 0) ? (
                                <button
                                  type="button"
                                  className="cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-0.5"
                                  onClick={() => setReadersModalMsg(msg)}
                                  title={
                                    msg.readByUsers &&
                                    msg.readByUsers.length > 0
                                      ? `Просмотрено (${msg.readByUsers.length}): ${msg.readByUsers.map((u: any) => `${u.lastName} ${u.firstName}`).join(", ")}`
                                      : "Просмотрено"
                                  }
                                >
                                  <CheckCheck
                                    aria-label="Просмотрено"
                                    className="w-3.5 h-3.5 text-white"
                                  />
                                  {msg.readByUsers &&
                                    msg.readByUsers.length > 1 && (
                                      <span className="text-[9px] text-white font-mono font-bold">
                                        {msg.readByUsers.length}
                                      </span>
                                    )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setReadersModalMsg(msg)}
                                  title="Отправлено (ещё не прочитано)"
                                >
                                  <Check
                                    aria-label="Отправлено"
                                    className="w-3 h-3 text-white/70"
                                  />
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Reactions Bar */}
                        <div className="flex items-center gap-1 mt-1 px-1 flex-wrap">
                          <MessageActions
                            message={msg}
                            isOwn={isMe}
                            canDeleteForAll={isMe || isConvAdmin}
                            conversations={conversations}
                            onReply={() => setReply(msg)}
                            onUpdate={() =>
                              activeConvId &&
                              fetchMessages(activeConvId, messageQuery, true)
                            }
                            onDeleteForMe={(msgId) => {
                              setMessages((prev) =>
                                prev.filter((m) => m.id !== msgId),
                              );
                              try {
                                const key = `classos_deleted_for_me_${user?.id}`;
                                const raw = localStorage.getItem(key);
                                const set = new Set(
                                  raw ? JSON.parse(raw) : [],
                                );
                                set.add(msgId);
                                localStorage.setItem(
                                  key,
                                  JSON.stringify(Array.from(set)),
                                );
                              } catch {}
                            }}
                            onViewReaders={() => setReadersModalMsg(msg)}
                          />
                          <button
                            className="text-[11px] text-foreground-muted px-2 py-1 hover:text-foreground font-medium"
                            onClick={() => setReply(msg)}
                          >
                            Ответить
                          </button>
                          {/* Grouped Reactions with detailed views */}
                          {getGroupedReactions(msg.reactions).map((gr: any) => (
                            <button
                              key={gr.emoji}
                              type="button"
                              onClick={() =>
                                setReactionDetailModal({
                                  emoji: gr.emoji,
                                  users: gr.users,
                                  })
                              }
                              title={`Поставили: ${gr.users.map((u: any) => `${u.lastName} ${u.firstName}`).join(", ")}`}
                              className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all hover:scale-105 shadow-xs ${
                                gr.hasMine
                                  ? "bg-accent/20 border-accent text-accent font-semibold"
                                  : "bg-surface-elevated border-border text-foreground"
                              }`}
                            >
                              <span>{gr.emoji}</span>
                              {gr.count > 1 && (
                                <span className="text-[10px] opacity-80">
                                  {gr.count}
                                </span>
                              )}
                            </button>
                          ))}
                          <div className="message-reactions transition-opacity flex items-center gap-1">
                            {EMOJIS.slice(0, 3).map((e) => (
                              <button
                                key={e}
                                onClick={() => handleReaction(msg.id, e)}
                                className="text-xs hover:scale-125 active:scale-95 transition-transform"
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
              <div className="p-3 sm:p-4 border-t border-border/70 bg-surface-elevated/70 backdrop-blur-xl shrink-0">
                {reply && (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-surface border border-border mb-3 text-xs animate-fade-in shadow-xs">
                    <div className="min-w-0 flex-1 border-l-2 border-accent pl-2.5">
                      <span className="font-semibold text-accent block">
                        Ответ на сообщение
                      </span>
                      <p className="truncate text-foreground-muted text-[11px]">
                        {reply.content || "Медиафайл"}
                      </p>
                    </div>
                    <button
                      aria-label="Отменить ответ"
                      className="p-1 rounded-full hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
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
                      className="p-2.5 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground transition-all shadow-xs hover:scale-105 active:scale-95 shrink-0"
                      title="Прикрепить файл или фото"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button type="button" className="icon-button shrink-0" aria-label="Эмодзи и стикеры" onClick={() => setExpressionsOpen(true)}><Smile size={20} /></button>
                    <input
                      ref={composerRef}
                      type="text"
                      placeholder="Напишите сообщение..."
                      value={messageInput}
                      onChange={(e) => typeMessage(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-xs"
                    />

                    {messageInput.trim() ? (
                      <button
                        type="submit"
                        aria-label="Отправить сообщение"
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white shadow-md shadow-accent/25 transition-all hover:scale-105 active:scale-95 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="p-2.5 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-accent transition-all shadow-xs hover:scale-105 active:scale-95 shrink-0"
                        title="Записать голосовое сообщение"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-accent/20 via-purple-500/20 to-sky-500/20 border border-border flex items-center justify-center text-accent shadow-xl">
                <MessageSquare className="w-10 h-10 text-accent animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground">
                  Мессенджер 7-«Б» класса
                </h3>
                <p className="text-xs text-foreground-muted max-w-sm mx-auto leading-relaxed">
                  Выберите диалог из списка слева, чтобы читать сообщения, отправлять фотографии, файлы и голосовые заметки.
                </p>
              </div>
              <button
                onClick={openNewChatDialog}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Начать новый диалог</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ExpressionPicker open={expressionsOpen} onOpenChange={setExpressionsOpen} busy={sendingSticker} onSticker={handleSendSticker} onEmoji={emoji => {
        const input = composerRef.current;
        const start = input?.selectionStart ?? messageInput.length;
        const end = input?.selectionEnd ?? start;
        typeMessage(messageInput.slice(0, start) + emoji + messageInput.slice(end));
        setTimeout(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
      }} />
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

      {/* Group Settings Sheet */}
      <Sheet
        open={groupSettingsOpen}
        onOpenChange={setGroupSettingsOpen}
        title="Настройки группы"
        description="Управление информацией о группе и её участниками"
      >
        {loadingGroupDetails && !groupDetails ? (
          <div className="py-8 text-center text-xs text-foreground-muted">
            Загрузка информации о группе...
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Rename section */}
            <form onSubmit={handleRenameGroup} className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Название группы
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  disabled={!isConvAdmin || renamingGroup}
                  placeholder="Название группы"
                  className="flex-1 bg-surface-elevated border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent disabled:opacity-60"
                />
                {isConvAdmin && (
                  <button
                    type="submit"
                    disabled={renamingGroup || !editingGroupName.trim()}
                    className="button text-xs shrink-0"
                  >
                    {renamingGroup ? "Сохранение..." : "Сохранить"}
                  </button>
                )}
              </div>
            </form>

            {/* Add member button */}
            {isConvAdmin && (
              <button
                type="button"
                onClick={() => {
                  setAddMemberSearch("");
                  setIsAddMemberOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus size={15} />
                <span>Добавить участника</span>
              </button>
            )}

            {/* Members section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Участники ({groupDetails?.members?.length || 0})</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {groupDetails?.members?.map((m: any) => {
                  const isCreator = groupDetails?.createdById === m.userId;
                  const isGroupAdmin = m.role === "ADMIN" || isCreator;
                  const isCurrent = m.userId === user?.id;

                  return (
                    <div
                      key={m.id || m.userId}
                      className="p-2.5 rounded-xl bg-surface-elevated/70 border border-border flex items-center justify-between gap-2"
                    >
                      <div
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={() => m.userId && setSelectedProfileUserId(m.userId)}
                        title="Открыть профиль в стиле Telegram"
                      >
                        <UserAvatar
                          src={m.user?.avatarUrl}
                          name={`${m.user?.firstName || ""} ${m.user?.lastName || ""}`}
                          size={34}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">
                            {m.user?.lastName} {m.user?.firstName}
                            {isCurrent && " (вы)"}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {isCreator ? (
                              <span className="text-[10px] text-accent font-medium flex items-center gap-0.5">
                                <ShieldCheck size={11} /> Создатель
                              </span>
                            ) : isGroupAdmin ? (
                              <span className="text-[10px] text-accent font-medium flex items-center gap-0.5">
                                <Shield size={11} /> Админ
                              </span>
                            ) : (
                              <span className="text-[10px] text-foreground-muted">
                                Участник
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {isConvAdmin && !isCreator && !isCurrent && (
                        <div className="flex items-center gap-1 shrink-0">
                          {m.role === "ADMIN" ? (
                            <button
                              type="button"
                              onClick={() => handleSetMemberRole(m.userId, "MEMBER")}
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                              title="Снять права администратора"
                            >
                              <Shield size={14} className="text-warning" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetMemberRole(m.userId, "ADMIN")}
                              className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-surface-hover transition-colors"
                              title="Сделать администратором"
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromGroup(m.userId)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Удалить из группы"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave group */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Вы уверены, что хотите выйти из группы?")) {
                    handleRemoveMemberFromGroup(user?.id || "");
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-danger/10 hover:bg-danger/15 text-danger text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut size={14} />
                <span>Выйти из группы</span>
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Add Member Sheet */}
      <Sheet
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        title="Добавить участника"
        description="Выберите пользователя для добавления в беседу"
      >
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по имени или логину..."
              value={addMemberSearch}
              onChange={(e) => setAddMemberSearch(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {availableUsersToAdd.length === 0 ? (
              <p className="py-6 text-center text-xs text-foreground-muted">
                {addMemberSearch ? "Никого не найдено" : "Все пользователи уже в группе"}
              </p>
            ) : (
              availableUsersToAdd.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-surface-elevated/70 border border-border flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      src={u.avatarUrl}
                      name={`${u.firstName} ${u.lastName}`}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {u.lastName} {u.firstName}
                      </p>
                      <p className="text-[10px] text-foreground-muted truncate">
                        @{u.username} • {u.role}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddMemberToGroup(u.id)}
                    className="button text-xs py-1 px-2.5 shrink-0"
                  >
                    Добавить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Sheet>

      {/* Readers Sheet */}
      <Sheet
        open={Boolean(readersModalMsg)}
        onOpenChange={(open) => !open && setReadersModalMsg(null)}
        title="Кто прочитал сообщение"
        description={
          readersModalMsg
            ? `Сообщение от ${new Date(readersModalMsg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
      >
        <div className="space-y-4 pt-2">
          {readersModalMsg?.content && (
            <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-foreground line-clamp-3">
              {readersModalMsg.content}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Eye size={14} className="text-accent" />
              <span>
                Просмотрено ({readersModalMsg?.readByUsers?.length || 0})
              </span>
            </h4>

            {readersModalMsg?.readByUsers && readersModalMsg.readByUsers.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {readersModalMsg.readByUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl bg-surface-elevated/70 border border-border flex items-center gap-2.5"
                  >
                    <UserAvatar
                      src={u.avatarUrl}
                      name={`${u.firstName || ""} ${u.lastName || ""}`}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {u.lastName} {u.firstName}
                      </p>
                      {u.username && (
                        <p className="text-[10px] text-foreground-muted truncate">
                          @{u.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-foreground-muted">
                Сообщение пока ещё никто не прочитал
              </p>
            )}
          </div>
        </div>
      </Sheet>

      {/* Reaction Detail Sheet */}
      <Sheet
        open={Boolean(reactionDetailModal)}
        onOpenChange={(open) => !open && setReactionDetailModal(null)}
        title={`Реакция ${reactionDetailModal?.emoji || ""}`}
        description={`${reactionDetailModal?.users?.length || 0} ${
          reactionDetailModal?.users?.length === 1 ? "пользователь" : "пользователей"
        }`}
      >
        <div className="space-y-3 pt-2">
          <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {reactionDetailModal?.users?.map((u: any, idx: number) => (
              <div
                key={u.id || idx}
                className="p-2.5 rounded-xl bg-surface-elevated/70 border border-border flex items-center gap-2.5"
              >
                <UserAvatar
                  src={u.avatarUrl}
                  name={`${u.firstName || ""} ${u.lastName || ""}`}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground truncate">
                    {u.lastName} {u.firstName}
                    {u.id === user?.id && " (вы)"}
                  </p>
                  {u.username && (
                    <p className="text-[10px] text-foreground-muted truncate">
                      @{u.username}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* Chat Notifications & Phone Push Sheet */}
      <Sheet
        open={notifSettingsOpen}
        onOpenChange={setNotifSettingsOpen}
        title="Уведомления чатов"
        description="Настройка push-уведомлений на телефон и звуковых сигналов"
      >
        <div className="space-y-4 pt-2">
          {/* Mobile / Browser Push Section */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                <Smartphone size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-foreground">
                  Уведомления на телефон и ПК
                </h4>
                <p className="text-[11px] text-foreground-muted">
                  Получайте сообщения даже когда сайт закрыт или свёрнут
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
              <span className="text-foreground-muted">Статус устройства:</span>
              <span
                className={`font-semibold ${
                  notifPermission === "granted"
                    ? "text-success"
                    : notifPermission === "denied"
                      ? "text-danger"
                      : "text-warning"
                }`}
              >
                {notifPermission === "granted"
                  ? "✓ Разрешены"
                  : notifPermission === "denied"
                    ? "✕ Заблокированы в браузере"
                    : "Не подключены"}
              </span>
            </div>

            {notifPermission !== "granted" ? (
              <button
                type="button"
                onClick={async () => {
                  const perm = await requestNotificationPermission();
                  setNotifPermission(perm);
                  if (perm === "granted") {
                    toast.success("Уведомления на устройстве включены!");
                    sendChatPushNotification({
                      title: "ClassOS",
                      body: "Уведомления успешно подключены к вашему устройству!",
                    });
                  } else {
                    toast.error(
                      "Разрешение не предоставлено. Проверьте настройки сайта в браузере.",
                    );
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Bell size={14} />
                <span>Включить уведомления на телефоне</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sendChatPushNotification({
                    title: "ClassOS • Тестовое уведомление",
                    body: "Уведомления чатов отлично работают на вашем телефоне!",
                  });
                  playNotificationSound();
                  toast.success("Тестовое уведомление отправлено на устройство!");
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-surface-hover hover:bg-surface-elevated border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Smartphone size={14} className="text-accent" />
                <span>Отправить тест на телефон</span>
              </button>
            )}
          </div>

          {/* Sound & Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/70 border border-border cursor-pointer">
              <div className="flex items-center gap-2.5">
                {chatSoundEnabled ? (
                  <Volume2 size={16} className="text-accent" />
                ) : (
                  <VolumeX size={16} className="text-foreground-muted" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Звук новых сообщений
                  </p>
                  <p className="text-[10px] text-foreground-muted">
                    Приятный мелодичный сигнал при входящем сообщении
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={chatSoundEnabled}
                onChange={(e) => {
                  setChatSoundEnabled(e.target.checked);
                  localStorage.setItem(
                    "classos_chat_sound_enabled",
                    e.target.checked ? "1" : "0",
                  );
                  if (e.target.checked) playNotificationSound();
                }}
                className="w-4 h-4 accent-accent rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/70 border border-border cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-accent" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Всплывающие уведомления (Push)
                  </p>
                  <p className="text-[10px] text-foreground-muted">
                    Показывать баннер на экране телефона или компьютера
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={chatPushEnabled}
                onChange={(e) => {
                  setChatPushEnabled(e.target.checked);
                  localStorage.setItem(
                    "classos_chat_push_enabled",
                    e.target.checked ? "1" : "0",
                  );
                }}
                className="w-4 h-4 accent-accent rounded"
              />
            </label>
          </div>

          {/* Muted Chats summary */}
          {mutedConvIds.size > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h5 className="text-xs font-semibold text-foreground-muted">
                Чаты с отключёнными уведомлениями ({mutedConvIds.size}):
              </h5>
              <div className="space-y-1">
                {conversations
                  .filter((c) => mutedConvIds.has(c.id))
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <span className="truncate">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = setConversationMuted(
                            user?.id || "",
                            c.id,
                            false,
                          );
                          setMutedConvIds(new Set(updated));
                          toast.success(`Уведомления для «${c.name}» включены`);
                        }}
                        className="text-xs text-accent hover:underline shrink-0 ml-2"
                      >
                        Включить
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <ViewportLayer className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
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
        </ViewportLayer>
      )}
      {/* Telegram User Profile Drawer Modal */}
      <UserProfileModal
        userId={selectedProfileUserId}
        isOpen={!!selectedProfileUserId}
        onClose={() => setSelectedProfileUserId(null)}
      />
    </AppShell>
  );
}
