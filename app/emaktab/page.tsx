"use client";
import { useEffect, useState } from "react";
import { CheckCircle, HelpCircle, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { isTeacherOrHigher } from "@/lib/auth/rbac";
import { request, json } from "@/components/tables/model";
import { toast } from "sonner";
type Status = {
  status: string;
  confirmedAt: string | null;
  nextReminderAt: string;
  needsConfirmation: boolean;
};
type Row = Status & {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};
const labels: Record<string, string> = {
  WORKING: "Доступ работает",
  NEEDS_HELP: "Нужна помощь",
  UNCONFIRMED: "Ещё не подтверждено",
};
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export default function EmaktabPage() {
  const { user } = useAuth();
  const canView = isTeacherOrHigher(user?.role);
  const [personal, setPersonal] = useState<Status | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  async function load() {
    if (!user) return;
    try {
      const result = await request("/api/emaktab");
      setPersonal(result.personal);
      if (canView) setRows((await request("/api/emaktab/summary")).rows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id, canView]);
  async function confirm(status: string) {
    setBusy(true);
    try {
      const result = await request("/api/emaktab", json("POST", { status }));
      setPersonal(result.personal);
      toast.success("Статус подтверждён. Следующее напоминание через 5 дней.");
      if (canView) await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (r) =>
      (filter === "all" ||
        (filter === "overdue" && r.needsConfirmation) ||
        r.status === filter) &&
      `${r.lastName} ${r.firstName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <AppShell title="Доступ к eMaktab">
      <PageHeader
        title="Доступ к eMaktab"
        description="Проверка доступа каждые 5 дней. Без сбора логинов и паролей."
      />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="inline-error" role="alert">
          {error}
          <button className="button ml-3" onClick={load}>
            Повторить
          </button>
        </p>
      ) : (
        <>
          {personal && (
            <section className="emaktab-personal">
              <h2>Мой доступ</h2>
              <p>
                Войдите в eMaktab самостоятельно, затем подтвердите результат
                здесь. Если пароль изменился, проверьте вход с новым паролем —
                вводить его в ClassOS не нужно.
              </p>
              <div className="emaktab-status">
                <strong>{labels[personal.status]}</strong>
                {personal.needsConfirmation && (
                  <span className="text-warning">Нужно подтверждение</span>
                )}
              </div>
              <p>Последнее подтверждение: {date(personal.confirmedAt)}</p>
              <div className="flex gap-3 flex-wrap my-4">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => confirm("WORKING")}
                >
                  <CheckCircle size={16} />
                  Доступ работает
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => confirm("NEEDS_HELP")}
                >
                  <HelpCircle size={16} />
                  Нужна помощь
                </button>
              </div>
              <p>
                Следующее напоминание: {date(personal.nextReminderAt)}. Статус
                можно изменить в любой момент.
              </p>
              <p>
                Вашу отметку видят классный руководитель, староста и
                администраторы. Другие ученики её не видят.
              </p>
            </section>
          )}
          {canView && (
            <section>
              <PageHeader
                title="Подтверждения класса"
                description="Закрытая сводка. Ученику доступна только его собственная отметка."
                actions={
                  <button className="button" onClick={load}>
                    <RefreshCw size={15} />
                    Обновить
                  </button>
                }
              />
              <div className="table-toolbar">
                <label className="table-search">
                  <Search size={15} />
                  <input
                    aria-label="Поиск ученика"
                    placeholder="Найти ученика…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  className="control"
                  aria-label="Фильтр подтверждений"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Все ученики</option>
                  <option value="overdue">Нужно подтверждение</option>
                  <option value="NEEDS_HELP">Нужна помощь</option>
                  <option value="WORKING">Доступ работает</option>
                </select>
              </div>
              {!filtered.length ? (
                <EmptyState title="Нет записей для этого фильтра" />
              ) : (
                <>
                  <div className="hidden md:block relative overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {[
                            "Ученик",
                            "Результат проверки",
                            "Подтверждение",
                            "Следующее напоминание",
                          ].map((h) => (
                            <th key={h} className="p-4 text-left font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="p-4">
                              {r.lastName} {r.firstName}
                            </td>
                            <td className="p-4">{labels[r.status]}</td>
                            <td className="p-4">
                              {date(r.confirmedAt)}
                              {r.needsConfirmation && (
                                <p className="text-warning mt-1">
                                  Нужно подтвердить
                                </p>
                              )}
                            </td>
                            <td className="p-4">{date(r.nextReminderAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden">
                    {filtered.map((r) => (
                      <div className="subtle-row" key={r.id}>
                        <strong>
                          {r.lastName} {r.firstName}
                        </strong>
                        <p>{labels[r.status]}</p>
                        <p>Подтверждено: {date(r.confirmedAt)}</p>
                        {r.needsConfirmation && (
                          <p className="text-warning">Нужно подтвердить</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
