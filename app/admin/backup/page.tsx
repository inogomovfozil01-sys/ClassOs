"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { isAdminOrOwner } from "@/lib/auth/rbac";
import {
  Database,
  Download,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  FileJson,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBackupPage() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      window.location.href = "/api/admin/backup";
      toast.success("Резервная копия скачана");
    } catch {
      toast.error("Не удалось скачать бэкап");
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <AppShell title="Резервные копии">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Резервное копирование и безопасность
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Экспорт полного состояния экосистемы ClassOS: пользователи,
            расписание, ДЗ, таблицы и новости
          </p>
        </div>

        {/* Download Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-border space-y-4 ">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 text-accent flex items-center justify-center shrink-0 ">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">
                Экспорт полного снапшота базы данных
              </h2>
              <p className="text-xs text-foreground-muted">
                Создаёт структурированный JSON-дамп со всеми данными класса.
              </p>
            </div>
          </div>

          <p className="text-xs text-foreground-muted leading-relaxed">
            В выгрузку входят: карточки учеников и учителей, расписание уроков,
            журнал точечных замен, опубликованные домашние задания, контрольные,
            ведомости и записи аудита.
          </p>

          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="px-5 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold  transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Скачать резервную копию (JSON)</span>
          </button>
        </div>

        {/* Restoration and Architecture documentation */}
        <div className="glass-panel rounded-3xl p-6 border border-border space-y-3 text-xs leading-relaxed text-foreground-muted">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Стратегия восстановления и безопасность</span>
          </div>
          <p>
            1. <strong>Локальное хранилище:</strong> База данных ClassOS
            хранится в файле{" "}
            <code className="text-accent font-mono">dev.db</code> (SQLite) либо
            на выделенном сервере PostgreSQL через переменную окружения{" "}
            <code className="text-accent font-mono">DATABASE_URL</code>.
          </p>
          <p>
            2. <strong>Загруженные файлы:</strong> Все бинарные файлы и
            голосовые сообщения сохраняются в директории{" "}
            <code className="text-accent font-mono">storage/uploads/</code> с
            безопасными хэшированными именами и MIME-проверкой.
          </p>
          <p>
            3. <strong>Восстановление:</strong> Для восстановления при аварии
            достаточно поместить резервную копию или скопировать файл базы
            данных в корень проекта и перезапустить сервер командой{" "}
            <code className="text-accent font-mono">npm run start</code>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
