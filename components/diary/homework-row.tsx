"use client";
import Link from "next/link";
import { Homework, formatDay } from "@/lib/diary";
export function HomeworkRow({ homework }: { homework: Homework }) {
  return (
    <Link className="homework-summary" href={`/homework/${homework.id}`}>
      <div>
        <span className="text-[11px] text-foreground-muted">
          {homework.subject?.name} · до {formatDay(homework.dueDate)}
        </span>
        <h3>{homework.title}</h3>
        <p>
          {homework.personalStatus === "DONE"
            ? "Готово"
            : homework.personalStatus === "IN_PROGRESS"
              ? "В процессе"
              : "Не начато"}
          {homework.attachments?.length
            ? ` · Вложений: ${homework.attachments.length}`
            : ""}
        </p>
      </div>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
