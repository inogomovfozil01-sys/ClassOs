"use client";
import { useState } from "react";
import {
  MoreHorizontal,
  Reply,
  Forward,
  Copy,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
export function MessageActions({
  message,
  isOwn,
  conversations,
  onReply,
  onUpdate,
}: {
  message: any;
  isOwn: boolean;
  conversations: any[];
  onReply: () => void;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function perform(method: string, body?: any) {
    setBusy(true);
    try {
      await request(
        `/api/messages/${message.id}`,
        body ? json(method, body) : { method },
      );
      setOpen(false);
      setAction("");
      onUpdate();
      toast.success("Готово");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось выполнить действие",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="text-foreground-muted p-1"
        aria-label="Действия с сообщением"
        onClick={() => {
          setOpen(true);
          setAction("");
        }}
      >
        <MoreHorizontal size={15} />
      </button>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title={
          action === "edit"
            ? "Изменить сообщение"
            : action === "forward"
              ? "Переслать в беседу"
              : action === "delete"
                ? "Удалить сообщение?"
                : action === "report"
                  ? "Пожаловаться"
                  : "Сообщение"
        }
      >
        {!action ? (
          <div className="message-action-list">
            <button
              onClick={() => {
                onReply();
                setOpen(false);
              }}
            >
              <Reply size={16} />
              Ответить
            </button>
            <button onClick={() => setAction("forward")}>
              <Forward size={16} />
              Переслать
            </button>
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(message.content)
                  .then(() => {
                    toast.success("Скопировано");
                    setOpen(false);
                  })
                  .catch(() => toast.error("Не удалось скопировать"))
              }
            >
              <Copy size={16} />
              Копировать
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => {
                    setAction("edit");
                    setText(message.content);
                  }}
                >
                  <Pencil size={16} />
                  Изменить
                </button>
                <button onClick={() => setAction("delete")}>
                  <Trash2 size={16} />
                  Удалить
                </button>
              </>
            )}
            <button
              onClick={() => {
                setAction("report");
                setText("");
              }}
            >
              <Flag size={16} />
              Пожаловаться
            </button>
          </div>
        ) : action === "forward" ? (
          <div className="message-action-list">
            {conversations.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() =>
                  perform("POST", { action: "forward", conversationId: c.id })
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : action === "delete" ? (
          <>
            <p className="text-sm text-foreground-muted">
              Сообщение будет удалено у участников беседы.
            </p>
            <div className="form-actions">
              <button className="button" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button
                disabled={busy}
                className="button danger"
                onClick={() => perform("DELETE")}
              >
                Удалить
              </button>
            </div>
          </>
        ) : (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              perform(
                action === "edit" ? "PATCH" : "POST",
                action === "edit"
                  ? { content: text }
                  : { action: "report", reason: text },
              );
            }}
          >
            <label className="field">
              {action === "edit" ? "Текст" : "Причина"}
              <textarea
                required
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Сохранить
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}
