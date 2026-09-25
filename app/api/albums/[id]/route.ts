import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewAlbum, canManageAlbum, normalizeAlbumPhoto } from "@/lib/albums";
import { saveUploadedFile, removeStoredFile } from "@/lib/storage";
type Context = { params: Promise<{ id: string }> };

async function access(ctx: Context) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 }) };
  const { id } = await ctx.params;
  const album = await prisma.classAlbum.findUnique({ where: { id } });
  if (!album || !canViewAlbum(user.role, album.audience)) return { error: NextResponse.json({ error: "Альбом недоступен" }, { status: 404 }) };
  return { user, album };
}
export async function GET(_: Request, ctx: Context) {
  const a = await access(ctx); if (a.error) return a.error;
  const photos = await prisma.albumPhoto.findMany({ where: { albumId: a.album.id }, orderBy: { createdAt: "desc" }, select: { id: true, caption: true, uploaderId: true, createdAt: true } });
  return NextResponse.json({ album: a.album, photos, canManage: canManageAlbum(a.user, a.album.createdById) });
}
export async function POST(req: Request, ctx: Context) {
  const a = await access(ctx); if (a.error) return a.error;
  let stored: string | undefined;
  try {
    const data = await req.formData(); const file = data.get("file");
    const caption = String(data.get("caption") || "").trim();
    if (!(file instanceof File) || caption.length > 300) return NextResponse.json({ error: "Выберите фото и подпись до 300 символов" }, { status: 400 });
    const buffer = await normalizeAlbumPhoto(Buffer.from(await file.arrayBuffer()));
    const saved = await saveUploadedFile(buffer, "photo.webp", "image/webp"); stored = saved.storageKey;
    const photo = await prisma.albumPhoto.create({ data: { albumId: a.album.id, uploaderId: a.user.id, caption, storageKey: stored }, select: { id: true } });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (e) {
    if (stored) await removeStoredFile(stored).catch(() => {});
    return NextResponse.json({ error: stored ? "Не удалось сохранить фотографию" : e instanceof Error ? e.message : "Ошибка загрузки" }, { status: 400 });
  }
}
export async function DELETE(_: Request, ctx: Context) {
  const a = await access(ctx); if (a.error) return a.error;
  if (!canManageAlbum(a.user, a.album.createdById)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const photos = await prisma.albumPhoto.findMany({ where: { albumId: a.album.id }, select: { storageKey: true } });
  await prisma.classAlbum.delete({ where: { id: a.album.id } });
  await Promise.all(photos.map(p => removeStoredFile(p.storageKey).catch(() => {})));
  return NextResponse.json({ success: true });
}
