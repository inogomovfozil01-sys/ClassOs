import sharp from "sharp";
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
export async function normalizeAvatar(buffer: Buffer) {
  if (!buffer.length || buffer.length > AVATAR_MAX_BYTES)
    throw Error("Выберите изображение размером до 4 МБ.");
  const image = sharp(buffer, { limitInputPixels: 25000000, failOn: "error" });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages || 1) > 1
  )
    throw Error("Нужна обычная фотография JPG, PNG или WebP.");
  return image
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();
}
export function avatarKey(
  url: string | null | undefined,
  id: string,
): string | null {
  const prefix = `/api/avatars/${id}?v=`;
  if (!url?.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return /^\d+-[a-f0-9]{32}\.webp$/.test(key) ? key : null;
}
