"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/workspace";
import { schoolLinks } from "@/components/layout/desktop-sidebar";
import { useAuth } from "@/components/providers/auth-context";
import {
  canAccessJarvis,
  canPublishHomework,
  canPublishNews,
  canManageUsers,
} from "@/lib/auth/rbac";
export function CommandPalette({
  isOpen,
  onClose,
  onOpenJarvis,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenJarvis?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [isOpen]);
  useEffect(() => {
    setSelected(0);
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const d = await r.json();
        setResults(d.results || []);
      } catch {
        if (!controller.signal.aborted)
          setError("Поиск недоступен. Попробуйте ещё раз.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };
  const commands = [
    ...(canPublishHomework(user?.role)
      ? [
          {
            label: "Создать домашнее задание",
            action: () => navigate("/homework?action=create"),
            group: "Быстрые действия",
          },
        ]
      : []),
    ...(canPublishNews(user?.role)
      ? [
          {
            label: "Опубликовать новость",
            action: () => navigate("/news?action=create"),
            group: "Быстрые действия",
          },
        ]
      : []),
    ...(canManageUsers(user?.role)
      ? [
          {
            label: "Добавить пользователя",
            action: () => navigate("/admin/users?action=create"),
            group: "Быстрые действия",
          },
        ]
      : []),
    ...(canAccessJarvis(user?.role)
      ? [
          {
            label: "Открыть JARVIS",
            action: () => {
              onClose();
              onOpenJarvis?.();
            },
            group: "Быстрые действия",
          },
        ]
      : []),
    ...schoolLinks.map((i) => ({
      label: i.label,
      action: () => navigate(i.href),
      group: "Навигация",
    })),
  ].filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const options = [
    ...results.map((r) => ({
      label: r.title,
      action: () => navigate(r.href),
      group: "Результаты поиска",
    })),
    ...commands,
  ];
  useEffect(() => {
    list.current
      ?.querySelectorAll("button")
      [selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => !v && onClose()}
      title="Поиск и команды"
    >
      <div
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((i) => Math.min(options.length - 1, i + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((i) => Math.max(0, i - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            options[selected]?.action();
          }
        }}
      >
        <label className="table-search max-w-none border-b border-border pb-2">
          <Search size={17} />
          <input
            autoFocus
            placeholder="Найти или перейти…"
            aria-label="Поиск команд"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div ref={list} className="max-h-[50dvh] overflow-auto mt-3">
          {options.map((o, i) => (
            <div key={`${o.group}-${o.label}-${i}`}>
              {(i === 0 || options[i - 1].group !== o.group) && (
                <p className="text-[11px] text-foreground-muted px-2 pt-4 pb-2">
                  {o.group}
                </p>
              )}
              <button
                className={`flex items-center justify-between w-full text-left p-3 rounded-lg text-xs ${selected === i ? "bg-surface-hover" : "hover:bg-surface-hover"}`}
                onClick={o.action}
              >
                <span>{o.label}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
          {!options.length && (
            <p className="text-xs text-foreground-muted p-3">
              {searching ? "Поиск…" : error || "Ничего не найдено"}
            </p>
          )}
        </div>
        <p className="text-[11px] text-foreground-muted mt-4">
          ↑ ↓ выбор · Enter открыть · Esc закрыть
        </p>
      </div>
    </Sheet>
  );
}
