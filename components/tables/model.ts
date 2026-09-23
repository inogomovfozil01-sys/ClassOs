import { getRoleDisplayName } from "../../lib/auth/rbac";
export type Column = {
  id: string;
  title: string;
  type: string;
  config?: string | null;
};
export type Row = {
  id: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  } | null;
  cells: { columnId: string; value: string | null }[];
};
export type SchoolTable = {
  id: string;
  title: string;
  description?: string;
  columns: Column[];
  rows: Row[];
};
export const cellValue = (row: Row, id: string) =>
  row.cells.find((c) => c.columnId === id)?.value || "";
export const studentName = (row: Row, columns: Column[]) =>
  row.student
    ? [row.student.lastName, row.student.firstName].filter(Boolean).join(" ") ||
      getRoleDisplayName(row.student.role)
    : cellValue(row, columns.find((c) => c.type === "STUDENT")?.id || "") ||
      "Без имени";
export const types = [
  ["TEXT", "Текст"],
  ["NUMBER", "Число / оценка"],
  ["STATUS", "Статус"],
  ["DATE", "Дата"],
  ["CHECKBOX", "Отметка"],
];
export function statusOptions(column: Column) {
  try {
    const config = JSON.parse(column.config || "{}");
    if (Array.isArray(config.options)) return config.options as string[];
  } catch {}
  return [
    "Сдано",
    "Не сдано",
    "В процессе",
    "Оплачено",
    "Освобождён",
    "Присутствует",
    "Н",
    "Б",
    "У",
  ];
}
export const templates = [
  {
    id: "attendance",
    title: "Посещаемость",
    description: "Ученик · даты · отметки",
    name: "Посещаемость",
    columns: () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          title: d.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
          }),
          type: "STATUS",
        };
      }),
  },
  {
    id: "grades",
    title: "Оценки",
    description: "Ученик · работы · результат",
    name: "Ведомость оценок",
    columns: () => [
      { title: "Работа 1", type: "NUMBER" },
      { title: "Работа 2", type: "NUMBER" },
      { title: "Работа 3", type: "NUMBER" },
      { title: "Итог", type: "NUMBER" },
    ],
  },
  {
    id: "books",
    title: "Сдача учебников",
    description: "Ученик · статус · примечание",
    name: "Сдача учебников",
    columns: () => [
      { title: "Сдано", type: "STATUS" },
      { title: "Примечание", type: "TEXT" },
    ],
  },
  {
    id: "custom",
    title: "Своя таблица",
    description: "Начните со списка учеников",
    name: "",
    columns: () => [],
  },
];
export async function request<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Не удалось выполнить действие");
  return data;
}
export const json = (method: string, body: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
