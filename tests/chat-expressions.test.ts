import { describe, it, expect } from "vitest";
import { getSticker, STICKERS, stickerContent } from "../lib/chat-expressions";

describe("Chat stickers", () => {
  it("resolves saved messages and rejects arbitrary files or unknown stickers", () => {
    for (const sticker of STICKERS) expect(getSticker(stickerContent(sticker))).toEqual(sticker);
    for (const invalid of [null, {}, "https://example.com/image.svg", "../../secret", "Стикер: неизвестный"]) expect(getSticker(invalid)).toBeUndefined();
  });
});
