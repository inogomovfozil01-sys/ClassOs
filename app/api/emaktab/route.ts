import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
const store = require("@/lib/emaktab-store.cjs");
const headers = { "Cache-Control": "private, no-store, max-age=0" };
const respond = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers });
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("request"),
      login: z.string().trim().max(120).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("issue"),
      userId: z.string().min(1).max(100),
      requestId: z.string().uuid(),
      password: z
        .string()
        .min(1)
        .max(256)
        .refine((s) => s.trim().length > 0),
      confirmedReset: z.literal(true),
    })
    .strict(),
  z
    .object({ action: z.literal("collect"), requestId: z.string().uuid() })
    .strict(),
  z
    .object({ action: z.literal("cancel"), requestId: z.string().uuid() })
    .strict(),
]);
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return respond({ error: "Не авторизован" }, 401);
  const [saved, teacher] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: store.PREFIX + user.id } }),
    prisma.user.findFirst({
      where: { role: "TEACHER", isBlocked: false },
      select: { id: true },
    }),
  ]);
  return respond({
    request: store.present(store.parseRecord(saved?.value)),
    teacherAvailable: Boolean(teacher),
  });
}
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return respond({ error: "Не авторизован" }, 401);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return respond({ error: "Недопустимый источник запроса" }, 403);
  try {
    const input = schema.safeParse(await req.json());
    if (!input.success)
      return respond(
        {
          error: "Проверьте поля формы и подтверждение смены пароля в eMaktab.",
        },
        400,
      );
    return respond(await store.act(prisma, user, input.data));
  } catch (error: any) {
    if (error instanceof store.RecoveryError)
      return respond({ error: error.message }, error.status);
    if (error instanceof SyntaxError)
      return respond({ error: "Некорректный запрос" }, 400);
    if (["P2002", "P2034"].includes(error?.code))
      return respond(
        { error: "Заявка уже обновляется. Обновите страницу." },
        409,
      );
    return respond(
      { error: "Не удалось обработать заявку. Попробуйте позже." },
      500,
    );
  }
}
