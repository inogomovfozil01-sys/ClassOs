"use client";
import { ViewportLayer } from "@/components/ui/viewport-layer";

import React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Newspaper,
  CalendarDays,
  FilePlus,
  Table,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import {
  canEditSchedule,
  canPublishHomework,
  canPublishNews,
  canAccessClassFiles,
} from "@/lib/auth/rbac";

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ isOpen, onClose }: QuickActionSheetProps) {
  const router = useRouter();
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const actions = [];

  if (canPublishHomework(user.role)) {
    actions.push({
      label: "Новое домашнее задание",
      desc: "Задать задание, прикрепить файлы и срок",
      icon: BookOpen,
      color: "text-accent bg-accent/15",
      href: "/homework?action=create",
    });
  }

  if (canEditSchedule(user.role)) {
    actions.push({
      label: "Изменение расписания",
      desc: "Замена учителя, перенос кабинета или отмена",
      icon: Calendar,
      color: "text-warning bg-warning/15",
      href: "/schedule?action=create",
    });
  }

  if (canPublishNews(user.role)) {
    actions.push({
      label: "Опубликовать новость",
      desc: "Объявление или пост в ленту класса",
      icon: Newspaper,
      color: "text-success bg-success/15",
      href: "/news?action=create",
    });
  }

  actions.push({
    label: "Новое событие класса",
    desc: "Олимпиада, поездка, экскурсия, сбор",
    icon: CalendarDays,
    color: "text-sky-400 bg-sky-500/15",
    href: "/events?action=create",
  });

  if (canAccessClassFiles(user.role)) {
    actions.push({
      label: "Загрузить файл",
      desc: "Учебные материалы, документы, презентации",
      icon: FilePlus,
      color: "text-accent bg-accent/15",
      href: "/files?action=upload",
    });
  }

  actions.push({
    label: "Создать таблицу",
    desc: "Списки сдачи книг, справок или дежурств",
    icon: Table,
    color: "text-foreground-muted bg-surface-elevated",
    href: "/tables?action=create",
  });

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <ViewportLayer className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full sm:max-w-md bg-surface border border-border-strong rounded-t-3xl sm:rounded-3xl p-5  relative z-10 animate-slide-up pb-safe max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-base text-foreground">
              Быстрое действие
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                onClick={() => handleSelect(act.href)}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-surface-hover/80 border border-transparent hover:border-border transition-all text-left group"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                    {act.label}
                  </p>
                  <p className="text-xs text-foreground-muted truncate">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ViewportLayer>
  );
}
