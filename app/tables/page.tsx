"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Table2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-context";
import { canManageTables } from "@/lib/auth/rbac";
import {
  PageHeader,
  Sheet,
  EmptyState,
  Skeleton,
} from "@/components/ui/workspace";
import { templates, request, json } from "@/components/tables/model";
type TableSummary = {
  id: string;
  title: string;
  description?: string;
  _count: { rows: number; columns: number };
};
export default function TablesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState("attendance");
  const [title, setTitle] = useState("Посещаемость");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = canManageTables(user?.role);
  useEffect(() => {
    request("/api/tables")
      .then((d) => setTables(d.tables))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    setOpen(
      new URLSearchParams(window.location.search).get("action") === "create",
    );
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const selected = templates.find((t) => t.id === template)!;
      const data = await request(
        "/api/tables",
        json("POST", {
          title,
          description,
          initialColumns: selected.columns(),
        }),
      );
      router.push(`/tables/${data.table.id}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось создать таблицу",
      );
      setBusy(false);
    }
  }
  const filtered = tables.filter((t) =>
    (t.title + " " + (t.description || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AppShell title="Таблицы и ведомости">
      <PageHeader
        title="Таблицы и ведомости"
        description="Посещаемость, оценки и дела класса. В привычном школьном формате."
        actions={
          canEdit && (
            <button className="button primary" onClick={() => setOpen(true)}>
              <Plus size={16} />
              Создать таблицу
            </button>
          )
        }
      />
      <div className="table-toolbar">
        <label className="table-search">
          <Search size={17} />
          <input
            aria-label="Найти таблицу"
            placeholder="Найти таблицу…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="text-xs text-foreground-muted self-center">
          {tables.length} таблиц
        </span>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : !filtered.length ? (
        <EmptyState
          title={search ? "Ничего не найдено" : "Первую ведомость создаёте вы"}
          description={
            search
              ? "Попробуйте другое название."
              : canEdit
                ? "Выберите шаблон, добавьте учеников из класса и заполните ячейки."
                : "Когда лидер или администратор создаст таблицу, она появится здесь."
          }
          action={
            canEdit &&
            !search && (
              <button className="button" onClick={() => setOpen(true)}>
                <Plus size={15} />
                Выбрать шаблон
              </button>
            )
          }
        />
      ) : (
        <div className="table-list">
          {filtered.map((t) => (
            <Link
              href={`/tables/${t.id}`}
              key={t.id}
              className="table-list-row"
            >
              <Table2 size={20} className="text-foreground-muted" />
              <div>
                <strong>{t.title}</strong>
                <p>{t.description || "Ведомость класса"}</p>
              </div>
              <small>{t._count.rows} строк</small>
              <small>{t._count.columns} столбцов</small>
              <ChevronRight size={16} className="text-foreground-muted" />
            </Link>
          ))}
        </div>
      )}
      <Sheet
        open={open && canEdit}
        onOpenChange={setOpen}
        title="Новая таблица"
        description="Шаблон создаст столбцы. Ученики добавляются из вашего класса."
      >
        <form onSubmit={create} className="form-stack">
          <div className="template-options">
            {templates.map((t) => (
              <button
                type="button"
                key={t.id}
                className="template-option"
                aria-pressed={template === t.id}
                onClick={() => {
                  setTemplate(t.id);
                  setTitle(t.name);
                }}
              >
                {t.title}
                <small>{t.description}</small>
              </button>
            ))}
          </div>
          <label className="field">
            Название
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, посещаемость за сентябрь"
            />
          </label>
          <label className="field">
            Описание
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="button"
              onClick={() => setOpen(false)}
            >
              Отмена
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Создание…" : "Создать таблицу"}
            </button>
          </div>
        </form>
      </Sheet>
    </AppShell>
  );
}
