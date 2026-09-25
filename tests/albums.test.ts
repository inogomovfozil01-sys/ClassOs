import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { canManageAlbum, canViewAlbum, normalizeAlbumPhoto } from "../lib/albums";

describe("Class album access", () => {
  it("keeps private albums inaccessible to teachers while allowing shared albums", () => {
    expect(canViewAlbum("TEACHER", "STUDENTS")).toBe(false);
    expect(canViewAlbum("TEACHER", "CLASS")).toBe(true);
    expect(canViewAlbum("STUDENT", "STUDENTS")).toBe(true);
    expect(canViewAlbum("GUEST", "CLASS")).toBe(false);
  });
  it("restricts album management to the creator or class administrators", () => {
    expect(canManageAlbum({ id: "other", role: "STUDENT" }, "creator")).toBe(false);
    expect(canManageAlbum({ id: "other", role: "TEACHER" }, "creator")).toBe(false);
    expect(canManageAlbum({ id: "other", role: "LEADER" }, "creator")).toBe(true);
    expect(canManageAlbum({ id: "creator", role: "STUDENT" }, "creator")).toBe(true);
  });
});
describe("Album photos", () => {
  it("keeps the photograph's proportions and produces bounded WebP bytes", async () => {
    const input = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#abcdef" } }).jpeg().toBuffer();
    const output = await normalizeAlbumPhoto(input); const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp"); expect(meta.width).toBe(2048); expect(meta.height).toBe(1024); expect(meta.exif).toBeUndefined();
  });
  it("rejects disguised documents and oversized files", async () => {
    await expect(normalizeAlbumPhoto(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).rejects.toThrow();
    await expect(normalizeAlbumPhoto(Buffer.alloc(4 * 1024 * 1024 + 1))).rejects.toThrow();
  });
});
