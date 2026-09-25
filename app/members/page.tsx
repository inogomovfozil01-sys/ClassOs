"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Sparkles, Copy, Check, Users, GraduationCap, School } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
import { useAuth } from "@/components/providers/auth-context";
import { useSocket } from "@/components/providers/socket-context";
import { getRoleDisplayName } from "@/lib/auth/rbac";
import { UserProfileModal } from "@/components/profile/user-profile-modal";

export default function MembersPage() {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const router = useRouter();
  const [users, setUsers] = useState<any[] | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"class" | "teachers">("class");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([request("/api/users"), request("/api/teachers")])
      .then(([u, t]) => {
        setUsers(u.users.filter((p: any) => !p.isBlocked));
        setTeachers(t.teachers);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function write(id: string) {
    setBusy(id);
    try {
      const d = await request(
        "/api/conversations",
        json("POST", { type: "DIRECT", targetUserId: id }),
      );
      router.push(`/chats?conversation=${d.conversation.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось открыть чат");
    } finally {
      setBusy("");
    }
  }

  const people =
    tab === "teachers"
      ? teachers
      : (users || []).filter((p) =>
          ["OWNER", "ADMIN", "STUDENT", "LEADER", "TEACHER"].includes(p.role),
        );

  const filtered = people.filter((p) =>
    `${p.lastName} ${p.firstName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const copyInvite = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/join`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Спец-ссылка для регистрации скопирована!");
      });
    }
  };

  const getRoleStyle = (role?: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "ADMIN":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "LEADER":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "TEACHER":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-surface-hover text-foreground-muted border-border";
    }
  };

  return (
    <AppShell title="Наш класс">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Invite Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Users size={24} className="text-accent" />
              <span>Наш класс</span>
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Ученики, староста, классный руководитель и преподаватели предметов
            </p>
          </div>

          <button
            type="button"
            onClick={copyInvite}
            className="px-4 py-2.5 rounded-2xl bg-accent/10 hover:bg-accent/15 border border-accent/25 text-accent font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {copiedLink ? <Check size={14} /> : <Sparkles size={14} />}
            <span>{copiedLink ? "Ссылка скопирована!" : "Скопировать ссылку для регистрации"}</span>
          </button>
        </div>

        {/* Navigation Tabs and Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="content-tabs mb-0" role="tablist" aria-label="Участники">
            <button
              role="tab"
              aria-selected={tab === "class"}
              onClick={() => setTab("class")}
              className="flex items-center gap-2"
            >
              <School size={14} />
              <span>Участники класса ({users?.length || 0})</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "teachers"}
              onClick={() => setTab("teachers")}
              className="flex items-center gap-2"
            >
              <GraduationCap size={14} />
              <span>Преподаватели ({teachers.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Поиск участника"
              placeholder="Найти по имени…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-2xl pl-10 pr-4 py-2 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent text-xs sm:text-sm transition-colors"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="inline-error">
            {error}
          </p>
        ) : !users ? (
          <Skeleton />
        ) : !filtered.length ? (
          <EmptyState
            title="Участники не найдены"
            description="Никто не найден по вашему запросу. Проверьте правильность написания имени."
          />
        ) : (
          <div className="members-grid">
            {filtered.map((p) => {
              const account = tab === "teachers" ? p.user?.id : p.id;
              const isOnline = account ? isUserOnline(account) : false;

              return (
                <div
                  key={p.id}
                  className="glass-panel p-4 rounded-2xl border border-border hover:border-border-strong transition-all flex items-center justify-between gap-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`relative shrink-0 ${account ? "cursor-pointer hover:opacity-85 transition-opacity" : ""}`}
                      onClick={() => account && setSelectedProfileId(account)}
                    >
                      <UserAvatar
                        src={p.user?.avatarUrl || p.avatarUrl}
                        name={`${p.firstName} ${p.lastName}`}
                        size={48}
                      />
                      {account && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
                            isOnline ? "bg-emerald-500 animate-pulse" : "bg-neutral-500/40"
                          }`}
                          title={isOnline ? "В сети" : "Не в сети"}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground break-words">
                        {account ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProfileId(account)}
                            className="block max-w-full whitespace-normal break-words hover:underline hover:text-accent transition-colors text-left font-semibold"
                          >
                            {p.lastName} {p.firstName} {p.middleName || ""}
                          </button>
                        ) : (
                          <>{p.lastName} {p.firstName} {p.middleName || ""}</>
                        )}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-1 min-w-0">
                        <span
                          className={`max-w-full break-words text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleStyle(
                            p.role,
                          )}`}
                        >
                          {tab === "teachers"
                            ? p.subjectName ||
                              p.subjects?.map((s: any) => s.name).join(", ") ||
                              "Учитель"
                            : getRoleDisplayName(p.role)}
                        </span>

                        {p.username && (
                          <span className="text-[11px] font-mono text-foreground-muted truncate">
                            @{p.username}
                          </span>
                        )}
                      </div>

                      {tab === "teachers" && p.notes && (
                        <p className="text-[11px] text-foreground-muted mt-1 truncate">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {account && account !== user?.id && (
                    <button
                      type="button"
                      aria-label={`Написать: ${p.lastName} ${p.firstName}`}
                      disabled={busy === account}
                      onClick={() => write(account)}
                      title="Написать сообщение"
                      className="w-9 h-9 rounded-xl bg-surface-elevated hover:bg-accent hover:text-white text-foreground-muted border border-border flex items-center justify-center shrink-0 transition-all shadow-sm"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Telegram Profile Modal */}
        <UserProfileModal
          userId={selectedProfileId}
          isOpen={!!selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      </div>
    </AppShell>
  );
}
