import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { normalizeAvatar, avatarKey, AVATAR_MAX_BYTES } from "../lib/avatar";
describe("Profile avatar processing", () => {
  it("normalizes a real photo to a square WebP without original metadata", async () => {
    const input = await sharp({
      create: { width: 900, height: 500, channels: 3, background: "#137f69" },
    })
      .jpeg()
      .toBuffer();
    const output = await normalizeAvatar(input);
    const info = await sharp(output).metadata();
    expect(info.format).toBe("webp");
    expect(info.width).toBe(512);
    expect(info.height).toBe(512);
    expect(info.exif).toBeUndefined();
  });
  it("rejects non-images, SVG and oversized uploads", async () => {
    await expect(
      normalizeAvatar(Buffer.from("not a picture")),
    ).rejects.toThrow();
    await expect(
      normalizeAvatar(
        Buffer.from(
          '<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
        ),
      ),
    ).rejects.toThrow();
    await expect(
      normalizeAvatar(Buffer.alloc(AVATAR_MAX_BYTES + 1)),
    ).rejects.toThrow();
  });
  it("does not treat another user or arbitrary file path as an owned avatar", () => {
    const key = "12345-" + "a".repeat(32) + ".webp";
    expect(avatarKey("/api/avatars/me?v=" + key, "me")).toBe(key);
    expect(avatarKey("/api/avatars/other?v=" + key, "me")).toBeNull();
    expect(avatarKey("/api/avatars/me?v=../secret", "me")).toBeNull();
    expect(avatarKey("https://external/image", "me")).toBeNull();
  });
});
