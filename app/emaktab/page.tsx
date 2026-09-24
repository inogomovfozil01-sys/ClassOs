"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, KeyRound, Eye, EyeOff, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  PageHeader,
  Skeleton,
  EmptyState,
  Sheet,
} from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { request, json } from "@/components/tables/model";
import { PrivateNote } from "@/components/emaktab/private-note";
import { toast } from "sonner";
type Ticket = {
  id: string;
  login: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  answeredAt: string | null;
};
type Row = Ticket & { userId: string; firstName: string; lastName: string };
const labels: Record<string, string> = {
  PENDING: "Ожидает учителя",
  READY: "Пароль готов",
  RECEIVED: "Получен учеником",
  EXPIRED: "Срок передачи истёк",
  CANCELLED: "Отменена",
};
const date = (value?: string | null) =>
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
  const teacher = user?.role === "TEACHER";
  const [personal, setPersonal] = useState<Ticket | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [teacherAvailable, setTeacherAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<Row | null>(null);
  const [password, setPassword] = useState("");
  const [confirmedReset, setConfirmedReset] = useState(false);
  const [delivery, setDelivery] = useState<{
    password: string;
    login: string;
  } | null>(null);
  const [showDelivery, setShowDelivery] = useState(false);
  async function load(quiet = false) {
    if (!user) return;
    try {
      const data = await request("/api/emaktab");
      setPersonal(data.request);
      setTeacherAvailable(data.teacherAvailable);
      if (teacher) setRows((await request("/api/emaktab/summary")).rows);
      setError("");
    } catch (e) {
      if (!quiet)
        setError(
          e instanceof Error ? e.message : "Не удалось загрузить заявки",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [user?.id, teacher]);
  useEffect(() => {
    setDelivery(null);
    setPassword("");
  }, [user?.id]);
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") setShowDelivery(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  async function act(body: unknown) {
    setBusy(true);
    try {
      const result = await request("/api/emaktab", json("POST", body));
      if (!teacher) setPersonal(result.request);
      if (result.password) {
        setDelivery({ password: result.password, login: result.request.login });
        setShowDelivery(false);
      } else
        toast.success(
          teacher ? "Временный пароль передан ученику" : "Заявка обновлена",
        );
      setSelected(null);
      setPassword("");
      setConfirmedReset(false);
      await load(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    } finally {
      setBusy(false);
    }
  }
  const active = personal && ["PENDING", "READY"].includes(personal.status);
  const filtered = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      `${r.lastName} ${r.firstName} ${r.login}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function reply(row: Row) {
    setSelected(row);
    setPassword("");
    setConfirmedReset(false);
  }
  return (
    <AppShell title="Забыл пароль">
      <PageHeader
        title="Забыл пароль"
        description={
          teacher
            ? "Заявки учеников на восстановление доступа к eMaktab."
            : "Личная заметка и помощь классного руководителя со входом в eMaktab."
        }
        actions={
          <button
            className="button"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Обновить
          </button>
        }
      />
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : teacher ? (
        <section className="space-y-5">
          <p className="text-sm text-foreground-muted">
            Сначала восстановите доступ через eMaktab или школьного
            администратора. Затем передайте выданный временный пароль
            конкретному ученику. ClassOS сам не меняет пароль в eMaktab. Личные
            заметки учеников вам недоступны.
          </p>
          <div className="table-toolbar">
            <label className="table-search">
              <Search size={16} />
              <input
                aria-label="Поиск заявки"
                placeholder="Ученик или логин…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="control"
              aria-label="Статус заявки"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Все заявки</option>
              {Object.entries(labels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {!filtered.length ? (
            <EmptyState
              title="Таких заявок пока нет"
              description="Новая заявка появится здесь и в ваших уведомлениях."
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {[
                        "Ученик",
                        "Логин eMaktab",
                        "Отправлено",
                        "Статус",
                        "Действие",
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
                        <td className="p-4 break-all">
                          {r.login || "Не указан"}
                        </td>
                        <td className="p-4">{date(r.createdAt)}</td>
                        <td className="p-4">{labels[r.status]}</td>
                        <td className="p-4">
                          {r.status === "PENDING" ? (
                            <button className="button" onClick={() => reply(r)}>
                              Передать новый пароль
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden">
                {filtered.map((r) => (
                  <article key={r.id} className="subtle-row space-y-2">
                    <strong>
                      {r.lastName} {r.firstName}
                    </strong>
                    <p className="break-all">Логин: {r.login || "не указан"}</p>
                    <p>
                      {date(r.createdAt)} · {labels[r.status]}
                    </p>
                    {r.status === "PENDING" && (
                      <button className="button" onClick={() => reply(r)}>
                        Передать новый пароль
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          <section className="emaktab-personal space-y-4">
            <h2 className="flex gap-2 items-center">
              <KeyRound size={20} />
              Помощь со входом
            </h2>
            <p>
              Нажмите «Забыл пароль», чтобы отправить заявку классному
              руководителю. Он восстановит доступ в eMaktab и сможет передать
              вам новый временный пароль. Текущий пароль отправлять не нужно.
            </p>
            {personal && (
              <div className="rounded-xl border border-border p-4 space-y-2">
                <strong>{labels[personal.status]}</strong>
                <p>Отправлено: {date(personal.createdAt)}</p>
                {personal.login && (
                  <p className="break-all">Логин: {personal.login}</p>
                )}
                {personal.status === "PENDING" && (
                  <p>Учитель получил уведомление. Ответ появится здесь.</p>
                )}
                {personal.status === "READY" && (
                  <>
                    <p>
                      Получите пароль до {date(personal.expiresAt)}. Он
                      показывается один раз: сохраните его в личную заметку или
                      свой менеджер паролей до закрытия страницы.
                    </p>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() =>
                        void act({ action: "collect", requestId: personal.id })
                      }
                    >
                      Получить новый пароль
                    </button>
                  </>
                )}
                {personal.status === "EXPIRED" && (
                  <p>
                    Временный пароль больше недоступен в ClassOS. Отправьте
                    новую заявку.
                  </p>
                )}
                {personal.status === "RECEIVED" && !delivery && (
                  <p>
                    Пароль уже получен. Если вы сохранили его, откройте личную
                    заметку ниже. При потере отправьте новую заявку.
                  </p>
                )}
                {active && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "cancel", requestId: personal.id })
                    }
                  >
                    Отменить заявку
                  </button>
                )}
              </div>
            )}
            {delivery && (
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-semibold">Новый временный пароль</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className="control flex-1 min-w-0"
                    aria-label="Полученный пароль"
                    type={showDelivery ? "text" : "password"}
                    value={delivery.password}
                    readOnly
                    autoComplete="off"
                  />
                  <button
                    className="button"
                    onClick={() => setShowDelivery(!showDelivery)}
                  >
                    {showDelivery ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
                    {showDelivery ? "Скрыть пароль" : "Показать пароль"}
                  </button>
                </div>
                <p>
                  Откройте личную заметку ниже и нажмите «Сохранить полученный
                  пароль». После входа в eMaktab смените временный пароль и
                  обновите заметку.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setDelivery(null);
                    setShowDelivery(false);
                  }}
                >
                  Я сохранил пароль — убрать с экрана
                </button>
              </div>
            )}
            {!active && !delivery && (
              <form
                className="space-y-3 max-w-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act({ action: "request", login });
                }}
              >
                <label className="block space-y-2">
                  <span>Логин eMaktab, если помните</span>
                  <input
                    className="control w-full"
                    aria-label="Логин eMaktab"
                    value={login}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </label>
                <p>Логин и заявку увидит только классный руководитель.</p>
                <button
                  className="button primary"
                  disabled={busy || !teacherAvailable}
                >
                  Забыл пароль — отправить заявку
                </button>
              </form>
            )}
            {!teacherAvailable && (
              <p role="status" className="text-warning">
                Классный руководитель ещё не добавлен. Попросите администратора
                создать для него аккаунт с ролью «Классный руководитель».
                {(user?.role === "OWNER" || user?.role === "ADMIN") && (
                  <Link className="block underline mt-2" href="/admin/users">
                    Открыть управление пользователями
                  </Link>
                )}
              </p>
            )}
          </section>
          {user && (
            <PrivateNote
              key={user.id}
              userId={user.id}
              delivery={delivery}
              onStored={() => {
                setDelivery(null);
                setShowDelivery(false);
              }}
            />
          )}
        </div>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setSelected(null);
            setPassword("");
          }
        }}
        title="Передать временный пароль"
        description={
          selected
            ? `${selected.lastName} ${selected.firstName} · ${selected.login || "логин не указан"}`
            : undefined
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected)
              void act({
                action: "issue",
                userId: selected.userId,
                requestId: selected.id,
                password,
                confirmedReset,
              });
          }}
        >
          <p className="text-sm text-foreground-muted">
            Укажите новый временный пароль, уже установленный в eMaktab. Его
            сможет получить только этот ученик. Срок передачи — 24 часа.
          </p>
          <label className="block space-y-2">
            <span>Новый временный пароль</span>
            <input
              className="control w-full"
              type="password"
              autoComplete="new-password"
              required
              maxLength={256}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              required
              checked={confirmedReset}
              onChange={(e) => setConfirmedReset(e.target.checked)}
            />
            <span>
              Я восстановил(а) доступ в eMaktab или получил(а) новый временный
              пароль от школьного администратора.
            </span>
          </label>
          <button
            className="button primary"
            disabled={busy || !confirmedReset || !password.trim()}
          >
            Передать ученику
          </button>
        </form>
      </Sheet>
    </AppShell>
  );
}
