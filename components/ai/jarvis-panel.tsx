"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React, { useState } from "react";
import {
  Command,
  X,
  Send,
  AlertTriangle,
  Check,
  ShieldAlert,
  Terminal,
  User,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface JarvisPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "jarvis";
  text: string;
  pendingAction?: {
    tool: string;
    params: any;
    risk: "WRITE" | "HIGH_RISK";
    summary: string;
  } | null;
  data?: any;
}

export function JarvisPanel({ isOpen, onClose }: JarvisPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "jarvis",
      text: "Здравствуйте! Я JARVIS — ваш интеллектуальный помощник администратора ClassOS. Я могу анализировать пользователей, расписание, таблицы, готовить публикации или выполнять поручения. Чем могу помочь?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка JARVIS");

      const jarvisMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "jarvis",
        text: data.reply,
        pendingAction: data.pendingAction,
        data: data.data,
      };

      setMessages((prev) => [...prev, jarvisMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "jarvis",
          text: `Ошибка: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, action: any) => {
    setActionProcessing(msgId);
    try {
      const res = await fetch("/api/ai/jarvis/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: action.tool,
          params: action.params,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Не удалось выполнить действие");

      toast.success(data.message || "Действие успешно выполнено");

      // Update message to remove pendingAction
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                pendingAction: null,
                text: `${m.text}\n\n✅ [Выполнено]: ${data.message || "Операция завершена."}`,
              }
            : m,
        ),
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingAction: null,
              text: `${m.text}\n\n❌ [Отменено администратором]`,
            }
          : m,
      ),
    );
    toast.info("Действие отменено");
  };

  return (
    <ViewportLayer className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full sm:w-[460px] h-full glass-panel border-l border-border-strong flex flex-col relative z-10 animate-slide-left ">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-elevated/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-accent/20 border border-accent/40 text-accent flex items-center justify-center ">
              <Command className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-foreground">JARVIS</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">
                  Admin AI
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Интеллектуальный ассистент класса
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.sender === "jarvis" && (
                <div className="w-7 h-7 rounded-xl bg-accent/20 border border-accent/30 text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 ${
                  m.sender === "user"
                    ? "bg-accent text-white font-medium shadow-sm"
                    : "bg-surface-elevated/80 border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Structured Confirmation Card */}
                {m.pendingAction && (
                  <div className="mt-3 p-3 rounded-xl bg-surface border border-border-strong space-y-2.5">
                    <div className="flex items-center gap-2">
                      {m.pendingAction.risk === "HIGH_RISK" ? (
                        <div className="flex items-center gap-1.5 text-danger font-bold text-[11px]">
                          <ShieldAlert className="w-4 h-4 text-danger" />
                          <span>
                            Критическое действие (требует подтверждения)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-warning font-bold text-[11px]">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span>Подтверждение публикации / изменения</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] font-medium text-foreground">
                      {m.pendingAction.summary}
                    </p>

                    <div className="p-2 rounded-lg bg-surface-elevated/80 border border-border font-mono text-[10px] text-foreground-muted overflow-x-auto">
                      {JSON.stringify(m.pendingAction.params, null, 2)}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleCancelAction(m.id)}
                        className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover text-foreground-muted text-[11px] font-medium transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() =>
                          handleConfirmAction(m.id, m.pendingAction)
                        }
                        disabled={actionProcessing === m.id}
                        className={`px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                          m.pendingAction.risk === "HIGH_RISK"
                            ? "bg-danger hover:bg-danger"
                            : "bg-accent hover:bg-accent-hover"
                        }`}
                      >
                        {actionProcessing === m.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Подтвердить и выполнить</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-surface-elevated border border-border text-foreground-muted text-xs">
                JARVIS думает...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-border bg-surface-elevated/40"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Спросите JARVIS о классе или отдайте поручение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-surface border border-border rounded-2xl pl-3.5 pr-12 py-2.5 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 p-2 rounded-xl bg-accent hover:bg-accent text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </ViewportLayer>
  );
}
