import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { saveUploadedFile, removeStoredFile } from "@/lib/storage";
import { AVATAR_MAX_BYTES, avatarKey, normalizeAvatar } from "@/lib/avatar";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать файл" },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File) || Array.from(form.keys()).some((key) => key !== "file"))
    return NextResponse.json({ error: "Выберите фотографию" }, { status: 400 });
  if (file.size > AVATAR_MAX_BYTES)
    return NextResponse.json(
      { error: "Размер фотографии — не больше 4 МБ" },
      { status: 413 },
    );
  let buffer: Buffer;
  try {
    buffer = await normalizeAvatar(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json(
      {
        error:
          "Не удалось открыть фотографию. Выберите JPG, PNG или WebP до 4 МБ и до 25 мегапикселей.",
      },
      { status: 400 },
    );
  }
  let key: string | null = null;
  try {
    const saved = await saveUploadedFile(buffer, "avatar.webp", "image/webp");
    key = saved.storageKey;
    const avatarUrl = `/api/avatars/${user.id}?v=${key}`;
    const result = await prisma.user.updateMany({
      where: { id: user.id, avatarUrl: user.avatarUrl || null },
      data: { avatarUrl },
    });
    if (!result.count) {
      await removeStoredFile(key);
      key = null;
      return NextResponse.json(
        { error: "Фото уже изменено в другой вкладке. Обновите профиль." },
        { status: 409 },
      );
    }
    key = null;
    const old = avatarKey(user.avatarUrl, user.id);
    if (old) await removeStoredFile(old).catch(() => {});
    return NextResponse.json({ avatarUrl });
  } catch {
    if (key) await removeStoredFile(key).catch(() => {});
    return NextResponse.json(
      { error: "Не удалось сохранить фотографию. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const result = await prisma.user.updateMany({
    where: { id: user.id, avatarUrl: user.avatarUrl || null },
    data: { avatarUrl: null },
  });
  if (!result.count)
    return NextResponse.json(
      { error: "Фото уже изменено. Обновите страницу." },
      { status: 409 },
    );
  const old = avatarKey(user.avatarUrl, user.id);
  if (old) await removeStoredFile(old).catch(() => {});
  return NextResponse.json({ avatarUrl: null });
}
