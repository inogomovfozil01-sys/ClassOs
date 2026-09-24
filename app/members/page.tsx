"use client";
import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useRouter } from "next/navigation";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
import { useAuth } from "@/components/providers/auth-context";
import { getRoleDisplayName } from "@/lib/auth/rbac";
export default function MembersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[] | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("class");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
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
          ["STUDENT", "LEADER", "TEACHER"].includes(p.role),
        );
  const filtered = people.filter((p) =>
    `${p.lastName} ${p.firstName}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <AppShell title="Наш класс">
      <PageHeader
        title="Наш класс"
        description="Ученики, лидер и классный руководитель. Преподаватели предметов — в отдельной вкладке."
      />
      <div className="content-tabs" role="tablist" aria-label="Участники">
        <button
          role="tab"
          aria-selected={tab === "class"}
          onClick={() => setTab("class")}
        >
          Участники класса
        </button>
        <button
          role="tab"
          aria-selected={tab === "teachers"}
          onClick={() => setTab("teachers")}
        >
          Преподаватели предметов
        </button>
      </div>
      <label className="table-search mb-4">
        <Search size={16} />
        <input
          aria-label="Поиск участника"
          placeholder="Найти по имени…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="inline-error">
          {error}
        </p>
      ) : !users ? (
        <Skeleton />
      ) : !filtered.length ? (
        <EmptyState
          title="Участники не найдены"
          description="Ученики появятся после создания аккаунтов администратором. Информацию об учителях заполняет лидер."
        />
      ) : (
        filtered.map((p) => {
          const account = tab === "teachers" ? p.user?.id : p.id;
          return (
            <div className="member-row" key={p.id}>
              <UserAvatar src={p.user?.avatarUrl || p.avatarUrl} name={`${p.firstName} ${p.lastName}`} />
              <div className="min-w-0 flex-1">
                <strong>
                  {p.lastName} {p.firstName} {p.middleName || ""}
                </strong>
                <p>
                  {tab === "teachers"
                    ? p.subjectName ||
                      p.subjects?.map((s: any) => s.name).join(", ") ||
                      "Учитель"
                    : getRoleDisplayName(p.role)}
                </p>
                {tab === "teachers" && p.notes && <p>{p.notes}</p>}
              </div>
              {account && account !== user?.id && (
                <button
                  className="icon-button"
                  aria-label={`Написать: ${p.lastName} ${p.firstName}`}
                  disabled={busy === account}
                  onClick={() => write(account)}
                >
                  <MessageSquare size={16} />
                </button>
              )}
            </div>
          );
        })
      )}
    </AppShell>
  );
}
