import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewAlbum, canManageAlbum } from "@/lib/albums";
import { readStoredFile, removeStoredFile } from "@/lib/storage";
type Context = { params: Promise<{ id: string }> };
async function access(ctx: Context) {
  const user = await getCurrentUser();
  if (!user) return { error: new NextResponse("Unauthorized", { status: 401 }) };
  const { id } = await ctx.params;
  const photo = await prisma.albumPhoto.findUnique({ where: { id }, include: { album: true } });
  if (!photo || !canViewAlbum(user.role, photo.album.audience)) return { error: new NextResponse("Not found", { status: 404 }) };
  return { user, photo };
}
export async function GET(_: Request, ctx: Context) {
  const a = await access(ctx); if (a.error) return a.error;
  const bytes = await readStoredFile(a.photo.storageKey);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export async function DELETE(_: Request, ctx: Context) {
  const a = await access(ctx); if (a.error) return a.error;
  if (a.user.id !== a.photo.uploaderId && !canManageAlbum(a.user, a.photo.album.createdById)) return NextResponse.json({ error: "Можно удалить только своё фото" }, { status: 403 });
  await prisma.albumPhoto.delete({ where: { id: a.photo.id } });
  await removeStoredFile(a.photo.storageKey).catch(() => {});
  return NextResponse.json({ success: true });
}
