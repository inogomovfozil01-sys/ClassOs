import sharp from "sharp";
import { isLeaderOrHigher } from "@/lib/auth/rbac";

export function canViewAlbum(role: string, audience: string) {
  return ["OWNER", "ADMIN", "LEADER", "STUDENT", "TEACHER"].includes(role) &&
    (audience === "CLASS" || role !== "TEACHER");
}
export function canManageAlbum(user: { id: string; role: string }, creatorId: string) {
  return user.id === creatorId || isLeaderOrHigher(user.role);
}
export async function normalizeAlbumPhoto(buffer: Buffer) {
  if (!buffer.length || buffer.length > 4 * 1024 * 1024) throw Error("Фотография должна быть до 4 МБ");
  const image = sharp(buffer, { limitInputPixels: 25000000, failOn: "error" });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages || 1) > 1)
    throw Error("Выберите фотографию JPG, PNG или WebP");
  return image.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}
