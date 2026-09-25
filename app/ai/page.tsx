"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import {
  Sparkles,
  Send,
  Bot,
  User,
  HelpCircle,
  BookOpen,
  Clock,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time?: string;
}

export default function ClassAIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 Привет! Я **Class AI** — персональный школьный помощник 7-«Б» класса школы №180.\n\nЯ знаю всё актуальное расписание уроков, кабинеты, домашние задания и предстоящие контрольные. Также я могу просто и понятно объяснить любую сложную тему, правило или задачу по любому предмету.\n\nО чём хочешь узнать?",
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const starters = [
    { label: "Что задали на завтра?", icon: "📚" },
    { label: "Расписание уроков на сегодня", icon: "⏰" },
    { label: "Когда ближайшая контрольная?", icon: "📝" },
    { label: "Объясни формулы сокращённого умножения", icon: "📐" },
    { label: "Как определить спряжение глагола?", icon: "📖" },
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка ответа AI");

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.text,
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Ошибка соединения с AI");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `⚠️ Не удалось связаться с сервисом: ${err.message || "попробуйте ещё раз"}.`,
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Ответ скопирован");
    });
  };

  const resetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Диалог очищен. Я готов ответить на любые вопросы по расписанию, домашке или школьной программе 7-«Б» класса! 🚀",
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.info("Чат сброшен");
  };

  // Simple rich text parser for bold, italics, and lines
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Process bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={idx} className={line.trim() === "" ? "h-2" : "leading-relaxed"}>
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <AppShell title="Class AI — Учебный помощник">
      <div className="max-w-4xl mx-auto h-[calc(100dvh-130px)] flex flex-col justify-between space-y-3">
        {/* Status Header Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl glass-panel border border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-accent/25 via-purple-500/20 to-sky-400/20 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Class AI</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-medium">
                  7-«Б» класс · Школа №180
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted mt-0.5">
                Интеллектуальный школьный ассистент
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetChat}
            className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground transition-colors shadow-xs"
            title="Очистить диалог"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2 custom-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs sm:text-sm ${
                m.sender === "user" ? "justify-end" : "justify-start"
              } animate-fade-in`}
            >
              {m.sender === "ai" && (
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-accent/20 to-purple-500/20 border border-accent/30 text-accent flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl p-4 relative group ${
                  m.sender === "user"
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "glass-panel border border-border shadow-sm text-foreground"
                }`}
              >
                <div className="text-xs sm:text-sm font-normal">
                  {renderFormattedText(m.text)}
                </div>

                <div
                  className={`flex items-center justify-between gap-4 mt-2 pt-1 border-t ${
                    m.sender === "user" ? "border-white/15 text-white/70" : "border-border/60 text-foreground-muted"
                  } text-[10px]`}
                >
                  <span>{m.time}</span>

                  {m.sender === "ai" && (
                    <button
                      type="button"
                      onClick={() => copyMessage(m.id, m.text)}
                      className="p-1 rounded hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-colors"
                      title="Скопировать"
                    >
                      {copiedId === m.id ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {m.sender === "user" && (
                <div className="w-8 h-8 rounded-2xl bg-accent text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4 animate-spin text-accent" />
              </div>
              <div className="p-3.5 rounded-3xl glass-panel border border-border text-foreground-muted text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span>Class AI сверяется с расписанием и готовит ответ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick starter chips */}
        {messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {starters.map((st, i) => (
              <button
                key={i}
                onClick={() => handleSend(st.label)}
                className="px-3.5 py-1.5 rounded-full glass-panel border border-border hover:border-accent text-xs text-foreground-muted hover:text-foreground transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <span>{st.icon}</span>
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Спросите о расписании, домашке или сложной задаче..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-surface-elevated border border-border rounded-3xl pl-4 pr-12 py-3 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Отправить запрос"
            className="absolute right-2 p-2.5 rounded-2xl bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 text-white disabled:opacity-40 transition-all shadow-md shadow-accent/25 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
