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
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/workspace";
import { request, json } from "@/components/tables/model";
import { UserAvatar } from "@/components/ui/user-avatar";

export function MessageActions({
  message,
  isOwn,
  canDeleteForAll,
  conversations,
  onReply,
  onUpdate,
  onDeleteForMe,
  onViewReaders,
}: {
  message: any;
  isOwn: boolean;
  canDeleteForAll?: boolean;
  conversations: any[];
  onReply: () => void;
  onUpdate: () => void;
  onDeleteForMe?: (messageId: string) => void;
  onViewReaders?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const allowDeleteForAll = canDeleteForAll ?? isOwn;

  async function perform(method: string, body?: any, mode?: "for_me" | "for_all") {
    setBusy(true);
    try {
      const url =
        method === "DELETE" && mode
          ? `/api/messages/${message.id}?mode=${mode}`
          : `/api/messages/${message.id}`;

      await request(
        url,
        body ? json(method, body) : { method },
      );
      setOpen(false);
      setAction("");
      onUpdate();
      toast.success(
        mode === "for_me"
          ? "Удалено у вас"
          : mode === "for_all"
            ? "Удалено у всех"
            : "Готово",
      );
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
        className="text-foreground-muted p-1 hover:text-foreground transition-colors"
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
                ? "Удаление сообщения"
                : action === "views"
                  ? "Кто прочитал"
                  : action === "report"
                    ? "Пожаловаться"
                    : "Действия с сообщением"
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
              <button
                onClick={() => {
                  setAction("edit");
                  setText(message.content);
                }}
              >
                <Pencil size={16} />
                Изменить
              </button>
            )}
            {/* View readers */}
            <button
              onClick={() => {
                if (onViewReaders) {
                  setOpen(false);
                  onViewReaders();
                } else {
                  setAction("views");
                }
              }}
            >
              <Eye size={16} />
              Кто прочитал ({message.readByUsers?.length || (message.readByOther ? 1 : 0)})
            </button>
            {/* Delete button (with choice) */}
            <button onClick={() => setAction("delete")}>
              <Trash2 size={16} />
              Удалить
            </button>
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
          <div className="space-y-3">
            <p className="text-xs text-foreground-muted">
              Выберите способ удаления сообщения:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={busy}
                className="w-full p-3 rounded-2xl bg-surface-elevated hover:bg-surface-hover border border-border text-left transition-colors"
                onClick={() => {
                  onDeleteForMe?.(message.id);
                  perform("DELETE", undefined, "for_me");
                }}
              >
                <div className="font-semibold text-xs text-foreground">
                  Удалить только у меня
                </div>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Сообщение исчезнет из вашего чата, но останется у других участников.
                </p>
              </button>

              {allowDeleteForAll && (
                <button
                  type="button"
                  disabled={busy}
                  className="w-full p-3 rounded-2xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-left transition-colors"
                  onClick={() => perform("DELETE", undefined, "for_all")}
                >
                  <div className="font-semibold text-xs text-destructive">
                    Удалить у всех
                  </div>
                  <p className="text-[11px] text-destructive/80 mt-0.5">
                    Сообщение будет безвозвратно удалено для всех участников беседы.
                  </p>
                </button>
              )}
            </div>
            <button
              className="button w-full mt-2"
              type="button"
              onClick={() => setOpen(false)}
            >
              Отмена
            </button>
          </div>
        ) : action === "views" ? (
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {message.readByUsers && message.readByUsers.length > 0 ? (
              message.readByUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-elevated border border-border"
                >
                  <UserAvatar
                    src={u.avatarUrl}
                    name={`${u.firstName} ${u.lastName}`}
                    size={28}
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      {u.lastName} {u.firstName}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-foreground-muted py-6 text-center">
                Сообщение пока никто не прочитал.
              </p>
            )}
            <button
              className="button w-full mt-3"
              type="button"
              onClick={() => setOpen(false)}
            >
              Закрыть
            </button>
          </div>
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
