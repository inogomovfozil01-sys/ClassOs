"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/workspace";
import { EMOJI_GROUPS, STICKERS, stickerContent } from "@/lib/chat-expressions";

export function ExpressionPicker({ open, onOpenChange, onEmoji, onSticker, busy }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  onEmoji: (emoji: string) => void; onSticker: (content: string) => void; busy: boolean;
}) {
  const [tab, setTab] = useState("emoji");
  return <Sheet open={open} onOpenChange={onOpenChange} title="Эмодзи и стикеры" description="Эмодзи добавляются в текст. Стикер отправляется отдельным сообщением.">
    <div className="expression-tabs" role="tablist" aria-label="Тип эмоции">
      <button role="tab" aria-selected={tab === "emoji"} onClick={() => setTab("emoji")}>Эмодзи</button>
      <button role="tab" aria-selected={tab === "stickers"} onClick={() => setTab("stickers")}>Стикеры</button>
    </div>
    <div className="expression-content" role="tabpanel" aria-label={tab === "emoji" ? "Эмодзи" : "Стикеры"}>
      {tab === "emoji" ? EMOJI_GROUPS.map(group => <section key={group.name}>
        <h3>{group.name}</h3>
        <div className="emoji-grid">{group.items.map(emoji => <button type="button" key={emoji} aria-label={`Добавить ${emoji}`} onClick={() => { onEmoji(emoji); onOpenChange(false); }}>{emoji}</button>)}</div>
      </section>) : <>
        <h3>ClassOS · Школьное настроение</h3>
        <div className="sticker-grid">{STICKERS.map(sticker => <button type="button" key={sticker.id} disabled={busy} aria-label={`Отправить стикер «${sticker.label}»`} onClick={() => onSticker(stickerContent(sticker))}>
          <img src={`/stickers/${sticker.id}.svg`} alt={sticker.label} width={160} height={160} loading="lazy" />
          <span>{sticker.label}</span>
        </button>)}</div>
        {busy && <p role="status">Отправляем стикер…</p>}
      </>}
    </div>
  </Sheet>;
}
