"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
export default function NotificationsPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    request("/api/notifications")
      .then((d) => setItems(d.notifications))
      .catch((e) => setError(e.message));
  }, []);
  async function mark() {
    try {
      await request("/api/notifications/mark-read", json("POST", {}));
      setItems((v) => v?.map((n) => ({ ...n, isRead: true })) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  }
  return (
    <AppShell title="Уведомления">
      <PageHeader
        title="Уведомления"
        actions={
          <button className="button" onClick={mark}>
            Прочитать все
          </button>
        }
      />
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : !items ? (
        <Skeleton />
      ) : !items.length ? (
        <EmptyState
          title="Новых уведомлений нет"
          description="Здесь появятся изменения расписания, задания и новости."
        />
      ) : (
        items.map((n, i) => (
          <div key={n.id}>
            {(i === 0 ||
              new Date(items[i - 1].createdAt).toDateString() !==
                new Date(n.createdAt).toDateString()) && (
              <h2 className="text-xs text-foreground-muted mt-6 mb-2">
                {new Date(n.createdAt).toLocaleDateString("ru-RU")}
              </h2>
            )}
            <Link href={n.link || "/notifications"} className="subtle-row">
              <strong>
                {!n.isRead && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-2" />
                )}
                {n.title}
              </strong>
              <p>{n.message}</p>
            </Link>
          </div>
        ))
      )}
    </AppShell>
  );
}
