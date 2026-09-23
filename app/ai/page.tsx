"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export default function ClassAIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Привет! Я Class AI — твой персональный школьный помощник. Я знаю актуальное расписание нашего класса, домашние задания и контрольные, а также помогу разобраться с любой сложной темой или задачей. О чём хочешь спросить?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const starters = [
    "Что задали на завтра?",
    "Какой первый урок в расписании?",
    "Когда ближайшая контрольная?",
    "Объясни суть фотосинтеза простыми словами",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
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
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.text,
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || "Ошибка соединения с AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Class AI — Помощник в учёбе">
      <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col justify-between space-y-4">
        {/* Chat message stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs sm:text-sm leading-relaxed ${
                m.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.sender === "ai" && (
                <div className="w-8 h-8 rounded-2xl bg-accent/20 border border-accent/30 text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-3xl p-4 ${
                  m.sender === "user"
                    ? "bg-accent text-white font-medium shadow-sm"
                    : "glass-panel border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-3xl glass-panel border border-border text-foreground-muted text-xs">
                Class AI думает и сверяется с расписанием...
              </div>
            </div>
          )}
        </div>

        {/* Quick starter chips */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {starters.map((st) => (
              <button
                key={st}
                onClick={() => handleSend(st)}
                className="px-3 py-1.5 rounded-full glass-panel border border-border hover:border-accent/40 text-xs text-foreground-muted hover:text-foreground transition-all"
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Задайте вопрос по урокам, ДЗ или любой учебной теме..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-surface-elevated border border-border rounded-3xl pl-4 pr-12 py-3 text-xs sm:text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent transition-colors "
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 rounded-2xl bg-accent hover:bg-accent-hover text-white disabled:opacity-40 transition-all "
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
