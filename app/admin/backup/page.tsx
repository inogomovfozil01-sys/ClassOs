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
                Сохраняет основные данные класса в файл JSON.
              </p>
            </div>
          </div>

          <p className="text-xs text-foreground-muted leading-relaxed">
            В выгрузку входят: карточки учеников и учителей, расписание уроков,
            журнал точечных замен, опубликованные домашние задания, контрольные,
            ведомости, новости и события. Пароли, сессии, переписка и содержимое
            загруженных файлов в эту выгрузку не входят.
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
            1. <strong>Данные класса:</strong> Скачивайте выгрузку перед
            значительными изменениями и храните её в защищённом месте.
          </p>
          <p>
            2. <strong>Полная резервная копия:</strong> Для облачной версии
            необходима резервная копия базы на стороне хостинга: она включает
            загруженные файлы и голосовые сообщения. Локальная версия требует
            отдельной копии базы и папки загрузок.
          </p>
          <p>
            3. <strong>Восстановление:</strong> Обратитесь к администратору
            хостинга. Автоматическое восстановление из этой JSON-выгрузки
            в интерфейсе пока не предусмотрено.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
