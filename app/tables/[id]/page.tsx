"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Users,
  Search,
  ArrowDownAZ,
  Columns3,
  Download,
  Check,
  ChevronRight,
  Table2,
  List,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  PageHeader,
  Sheet,
  EmptyState,
  Skeleton,
} from "@/components/ui/workspace";
import { useAuth } from "@/components/providers/auth-context";
import { canManageTables } from "@/lib/auth/rbac";
import { CellEditor } from "@/components/tables/cell-editor";
import {
  Column,
  Row,
  SchoolTable,
  cellValue,
  studentName,
  types,
  statusOptions,
  request,
  json,
} from "@/components/tables/model";

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = canManageTables(user?.role);
  const [table, setTable] = useState<SchoolTable | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(false);
  const [filter, setFilter] = useState("all");
  const [hidden, setHidden] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [columnOpen, setColumnOpen] = useState(false);
  const [colTitle, setColTitle] = useState("");
  const [colType, setColType] = useState("STATUS");
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("Все изменения сохранены");
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [bulkColumn, setBulkColumn] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const pending = useRef(0);
  const failures = useRef(new Set<string>());
  const load = useCallback(async () => {
    try {
      const d = await request<{ table: SchoolTable }>(`/api/tables/${id}`);
      setTable(d.table);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить таблицу");
    }
  }, [id]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        if (canEdit)
          await request(
            `/api/tables/${id}/rows`,
            json("POST", { addAllStudents: true }),
          );
        if (active) await load();
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Не удалось обновить список класса",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [load, id, user?.id, canEdit]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current || failures.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function save(rowId: string, columnId: string, value: string) {
    const key = rowId + columnId;
    pending.current++;
    setSaveState("Сохранение…");
    try {
      await request(
        `/api/tables/${id}/cells`,
        json("PATCH", { rowId, columnId, value }),
      );
      failures.current.delete(key);
      setTable((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((r) =>
                r.id !== rowId
                  ? r
                  : {
                      ...r,
                      cells: [
                        ...r.cells.filter((c) => c.columnId !== columnId),
                        { columnId, value },
                      ],
                    },
              ),
            }
          : prev,
      );
      return true;
    } catch (e) {
      failures.current.add(key);
      toast.error(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить. Повторите ввод.",
      );
      return false;
    } finally {
      pending.current--;
      setSaveState(
        failures.current.size
          ? "Есть несохранённые ячейки. Повторите ввод."
          : pending.current
            ? "Сохранение…"
            : "Все изменения сохранены",
      );
    }
  }
  async function addRows(all: boolean) {
    setBusy(true);
    try {
      const d = await request(
        `/api/tables/${id}/rows`,
        json("POST", all ? { addAllStudents: true } : {}),
      );
      toast.success(
        d.count
          ? `Добавлено строк: ${d.count}`
          : "Все участники уже добавлены.",
      );
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось добавить строки",
      );
    } finally {
      setBusy(false);
    }
  }
  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        `/api/tables/${id}/columns`,
        json("POST", { title: colTitle, type: colType }),
      );
      setColumnOpen(false);
      setColTitle("");
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось добавить столбец",
      );
    } finally {
      setBusy(false);
    }
  }
  function openRow(row: Row) {
    setEditing(row);
    setDraft(
      Object.fromEntries(
        table!.columns.map((c) => [c.id, cellValue(row, c.id)]),
      ),
    );
  }
  async function saveRow() {
    if (!editing || !table) return;
    setBusy(true);
    let ok = true;
    for (const col of table.columns) {
      if (col.type === "STUDENT" && editing.student) continue;
      if ((draft[col.id] || "") !== cellValue(editing, col.id))
        ok = (await save(editing.id, col.id, draft[col.id] || "")) && ok;
    }
    setBusy(false);
    if (ok) {
      setEditing(null);
      toast.success("Строка сохранена");
    }
  }
  async function bulkApply() {
    if (!bulkColumn) return;
    setBusy(true);
    let ok = true;
    for (const rowId of selected)
      ok = (await save(rowId, bulkColumn, bulkValue)) && ok;
    setBusy(false);
    if (ok) {
      setSelected([]);
      toast.success("Выбранные строки обновлены");
    }
  }
  function resize(e: React.PointerEvent<HTMLSpanElement>, col: Column) {
    const start = e.clientX;
    const initial = widths[col.id] || (col.type === "STUDENT" ? 230 : 132);
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = e.currentTarget;
    const move = (event: PointerEvent) =>
      setWidths((w) => ({
        ...w,
        [col.id]: Math.max(90, Math.min(480, initial + event.clientX - start)),
      }));
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  const columns = table?.columns.filter((c) => !hidden.includes(c.id)) || [];
  const rows = (table?.rows || []).filter((r) => {
    const matches = (
      studentName(r, table!.columns) +
      " " +
      r.cells.map((c) => c.value || "").join(" ")
    )
      .toLowerCase()
      .includes(search.toLowerCase());
    return (
      matches &&
      (filter === "all" ||
        table!.columns
          .filter((c) => c.type !== "STUDENT")
          .some((c) => !cellValue(r, c.id)))
    );
  });
  if (sort)
    rows.sort((a, b) =>
      studentName(a, table!.columns).localeCompare(
        studentName(b, table!.columns),
        "ru",
      ),
    );
  function exportCsv() {
    if (!table) return;
    const escape = (s: string) =>
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
    const data = [
      columns.map((c) => c.title),
      ...rows.map((r) =>
        columns.map((c) =>
          c.type === "STUDENT" && r.student
            ? studentName(r, table.columns)
            : cellValue(r, c.id),
        ),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + data.map((r) => r.map(escape).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = table.title + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const bulkType = table?.columns.find((c) => c.id === bulkColumn);
  return (
    <AppShell title={table?.title || "Таблица"}>
      <Link
        className="inline-flex items-center gap-2 text-xs text-foreground-muted mb-5"
        href="/tables"
      >
        <ArrowLeft size={14} />
        Все таблицы
      </Link>
      {error ? (
        <div role="alert" className="inline-error">
          {error}
          <button className="button ml-3" onClick={load}>
            Повторить
          </button>
        </div>
      ) : !table ? (
        <Skeleton />
      ) : (
        <>
          <PageHeader
            title={table.title}
            description={table.description || "Ведомость класса"}
            actions={
              canEdit && (
                <>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => addRows(true)}
                  >
                    <Users size={15} />
                    Обновить состав класса
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setColumnOpen(true)}
                  >
                    <Plus size={15} />
                    Столбец
                  </button>
                </>
              )
            }
          />
          <div className="table-toolbar">
            <label className="table-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти ученика или запись…"
                aria-label="Поиск по ведомости"
              />
            </label>
            <div className="toolbar-actions">
              <select
                className="button"
                aria-label="Фильтр строк"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Все записи</option>
                <option value="empty">Есть пустые ячейки</option>
              </select>
              <button
                className="button"
                aria-pressed={sort}
                onClick={() => setSort(!sort)}
                title="По алфавиту"
              >
                <ArrowDownAZ size={15} />
                <span className="hidden sm:inline">По имени</span>
              </button>
              <div className="column-menu">
                <button
                  className="button"
                  aria-expanded={columnsOpen}
                  onClick={() => setColumnsOpen(!columnsOpen)}
                >
                  <Columns3 size={15} />
                  <span className="hidden sm:inline">Столбцы</span>
                </button>
                {columnsOpen && (
                  <div>
                    {table.columns.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={!hidden.includes(c.id)}
                          disabled={c.type === "STUDENT"}
                          onChange={(e) =>
                            setHidden((h) =>
                              e.target.checked
                                ? h.filter((v) => v !== c.id)
                                : [...h, c.id],
                            )
                          }
                        />
                        {c.title}
                      </label>
                    ))}
                    <button
                      className="button w-full mt-2"
                      onClick={() => setColumnsOpen(false)}
                    >
                      Готово
                    </button>
                  </div>
                )}
              </div>
              <button
                className="button"
                onClick={exportCsv}
                title="Скачать CSV"
                aria-label="Скачать CSV"
              >
                <Download size={15} />
              </button>
              <button
                className="button md:hidden"
                onClick={() => setGrid(!grid)}
                aria-label={grid ? "Показать список" : "Показать сетку"}
              >
                {grid ? <List size={15} /> : <Table2 size={15} />}
              </button>
            </div>
          </div>
          {selected.length > 0 && canEdit && (
            <div className="table-bulk">
              <span>Выбрано: {selected.length}</span>
              <select
                className="control"
                aria-label="Столбец для заполнения"
                value={bulkColumn}
                onChange={(e) => {
                  setBulkColumn(e.target.value);
                  setBulkValue("");
                }}
              >
                <option value="">Столбец…</option>
                {table.columns
                  .filter((c) => c.type !== "STUDENT")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
              {bulkType?.type === "STATUS" ? (
                <select
                  className="control"
                  aria-label="Новое значение"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                >
                  <option value="">Очистить</option>
                  {statusOptions(bulkType).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="control"
                  aria-label="Новое значение"
                  placeholder="Новое значение"
                  value={bulkValue}
                  type={
                    bulkType?.type === "NUMBER"
                      ? "number"
                      : bulkType?.type === "DATE"
                        ? "date"
                        : "text"
                  }
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              )}
              <button
                className="button"
                disabled={!bulkColumn || busy}
                onClick={bulkApply}
              >
                Применить
              </button>
              <button className="button" onClick={() => setSelected([])}>
                Отменить выбор
              </button>
            </div>
          )}
          <div
            className={`table-frame desktop-register ${grid ? "show-grid" : ""}`}
          >
            <div className="register-scroll">
              <table
                className="register"
                style={{
                  minWidth:
                    42 +
                    (canEdit ? 36 : 0) +
                    columns.reduce(
                      (n, c) =>
                        n +
                        (widths[c.id] || (c.type === "STUDENT" ? 230 : 132)),
                      0,
                    ),
                }}
              >
                <caption className="sr-only">
                  {table.title}. Школьная ведомость с редактируемыми ячейками.
                </caption>
                <colgroup>
                  {canEdit && <col style={{ width: 36 }} />}
                  <col style={{ width: 42 }} />
                  {columns.map((c) => (
                    <col
                      key={c.id}
                      style={{
                        width:
                          widths[c.id] || (c.type === "STUDENT" ? 230 : 132),
                      }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {canEdit && (
                      <th className="text-center">
                        <input
                          aria-label="Выбрать все строки"
                          type="checkbox"
                          checked={
                            rows.length > 0 &&
                            rows.every((r) => selected.includes(r.id))
                          }
                          onChange={(e) =>
                            setSelected(
                              e.target.checked ? rows.map((r) => r.id) : [],
                            )
                          }
                        />
                      </th>
                    )}
                    <th className="row-number" scope="col">
                      №
                    </th>
                    {columns.map((c) => (
                      <th
                        key={c.id}
                        scope="col"
                        className={c.type === "STUDENT" ? "student-column" : ""}
                      >
                        {c.title}
                        <span
                          className="resize-handle"
                          onPointerDown={(e) => resize(e, c)}
                          title="Потяните, чтобы изменить ширину"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} data-selected={selected.includes(row.id)}>
                      {canEdit && (
                        <td className="text-center">
                          <input
                            type="checkbox"
                            aria-label={`Выбрать: ${studentName(row, table.columns)}`}
                            checked={selected.includes(row.id)}
                            onChange={(e) =>
                              setSelected((s) =>
                                e.target.checked
                                  ? [...s, row.id]
                                  : s.filter((v) => v !== row.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td className="row-number">{index + 1}</td>
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={
                            col.type === "STUDENT" ? "student-column" : ""
                          }
                        >
                          {col.type === "STUDENT" && row.student ? (
                            studentName(row, table.columns)
                          ) : (
                            <CellEditor
                              column={col}
                              value={cellValue(row, col.id)}
                              disabled={!canEdit}
                              label={`${studentName(row, table.columns)} — ${col.title}`}
                              onSave={(v) => save(row.id, col.id, v)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <EmptyState
                  title={
                    search ? "Записи не найдены" : "Список учеников пока пуст"
                  }
                  description={
                    canEdit
                      ? "Добавьте учеников класса или создайте строку вручную."
                      : "Лидер класса ещё не заполнил эту ведомость."
                  }
                />
              )}
            </div>
            <div className="table-footer">
              <span>
                {rows.length} из {table.rows.length} записей · {columns.length}{" "}
                столбцов
              </span>
              <span aria-live="polite">
                {canEdit ? saveState : "Только просмотр"}
              </span>
            </div>
          </div>
          <div className={`mobile-register-rows ${grid ? "hide-rows" : ""}`}>
            {rows.map((r, i) => (
              <button
                key={r.id}
                className="register-row"
                onClick={() => openRow(r)}
              >
                <span className="text-xs text-foreground-muted">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <strong>{studentName(r, table.columns)}</strong>
                  <small>
                    {table.columns.filter((c) => c.type !== "STUDENT").length}{" "}
                    полей · заполнено{" "}
                    {
                      table.columns.filter(
                        (c) => c.type !== "STUDENT" && cellValue(r, c.id),
                      ).length
                    }
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!rows.length && (
              <EmptyState
                title="Записей пока нет"
                description="Добавьте учеников или измените поиск."
              />
            )}
          </div>
          {canEdit && (
            <button
              className="button mt-4"
              disabled={busy}
              onClick={() => addRows(false)}
            >
              <Plus size={14} />
              Добавить строку
            </button>
          )}
          <p className="text-xs text-foreground-muted mt-4">
            {canEdit
              ? "Enter — сохранить ячейку · Tab — следующая ячейка. "
              : ""}
            Для посещаемости: Н — отсутствие, Б — болезнь, У — уважительная
            причина.
          </p>
          <Sheet
            open={columnOpen}
            onOpenChange={setColumnOpen}
            title="Добавить столбец"
          >
            <form className="form-stack" onSubmit={addColumn}>
              <label className="field">
                Название
                <input
                  required
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  placeholder="Дата, предмет или название работы"
                />
              </label>
              <label className="field">
                Тип данных
                <select
                  value={colType}
                  onChange={(e) => setColType(e.target.value)}
                >
                  {types.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => setColumnOpen(false)}
                >
                  Отмена
                </button>
                <button className="button primary" disabled={busy}>
                  Добавить
                </button>
              </div>
            </form>
          </Sheet>
          <Sheet
            open={!!editing}
            onOpenChange={(v) => {
              if (!v && !busy) setEditing(null);
            }}
            title={editing ? studentName(editing, table.columns) : "Запись"}
            description={canEdit ? "Все поля ведомости" : "Просмотр записи"}
          >
            <div className="form-stack">
              {editing &&
                table.columns.map((c) => (
                  <label className="field" key={c.id}>
                    {c.title}
                    {c.type === "STUDENT" && editing.student ? (
                      <span>{studentName(editing, table.columns)}</span>
                    ) : c.type === "STATUS" ? (
                      <select
                        disabled={!canEdit}
                        value={draft[c.id] || ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                      >
                        <option value="">—</option>
                        {Array.from(
                          new Set([
                            ...statusOptions(c),
                            ...(draft[c.id] ? [draft[c.id]] : []),
                          ]),
                        ).map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : c.type === "CHECKBOX" ? (
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={draft[c.id] === "true"}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [c.id]: String(e.target.checked),
                          }))
                        }
                      />
                    ) : (
                      <input
                        disabled={!canEdit}
                        type={
                          c.type === "NUMBER"
                            ? "number"
                            : c.type === "DATE"
                              ? "date"
                              : "text"
                        }
                        value={draft[c.id] || ""}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [c.id]: e.target.value }))
                        }
                      />
                    )}
                  </label>
                ))}
              {canEdit && (
                <div className="form-actions">
                  <button
                    className="button primary"
                    onClick={saveRow}
                    disabled={busy}
                  >
                    <Save size={15} />
                    {busy ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              )}
            </div>
          </Sheet>
        </>
      )}
    </AppShell>
  );
}
