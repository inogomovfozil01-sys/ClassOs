"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { canManageUsers } from "@/lib/auth/rbac";
import { FileText, Shield, Clock, Search, Filter } from "lucide-react";

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit?entity=${entityFilter}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  return (
    <AppShell title="Журнал аудита">
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Журнал аудита системы
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Неизменяемая история всех административных действий, изменений
              расписания и доступа
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-foreground-muted" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-surface-elevated border border-border rounded-2xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="ALL">Все категории</option>
              <option value="USER">Пользователи</option>
              <option value="SCHEDULE">Расписание</option>
              <option value="HOMEWORK">Домашние задания</option>
              <option value="NEWS">Новости</option>
              <option value="AI_ACTION">Действия JARVIS</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-foreground-muted">
            Загрузка журнала...
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-xs text-foreground-muted border border-border">
            Записи аудита отсутствуют
          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-border overflow-hidden ">
            <div className="divide-y divide-border/60">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 sm:px-6 space-y-1.5 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-foreground font-mono break-all">
                        {log.action}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-foreground-muted uppercase font-bold">
                        {log.entity}
                      </span>
                    </div>
                    <span className="text-[11px] text-foreground-muted">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 break-words text-xs text-foreground-muted">
                    <span>
                      Инициатор:{" "}
                      <strong className="text-foreground">
                        {log.user
                          ? `${log.user.lastName} ${log.user.firstName} (@${log.user.username})`
                          : "Система"}
                      </strong>
                    </span>
                    {log.ipAddress && (
                      <span className="font-mono text-[10px] text-foreground-muted/60">
                        IP: {log.ipAddress}
                      </span>
                    )}
                  </div>

                  {log.details && (
                    <div className="mt-1 p-2 rounded-xl bg-surface-elevated/70 border border-border font-mono text-[10px] text-foreground-muted overflow-x-auto">
                      {typeof log.details === "string"
                        ? log.details
                        : JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
