import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isLeaderOrHigher } from "@/lib/auth/rbac";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  const albums = await prisma.classAlbum.findMany({
    where: user.role === "TEACHER" ? { audience: "CLASS" } : {},
    include: { _count: { select: { photos: true } }, photos: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ albums, canCreate: isLeaderOrHigher(user.role) });
}
const schema = z.object({
  title: z.string().trim().min(1).max(100), description: z.string().trim().max(500).default(""),
  audience: z.enum(["STUDENTS", "CLASS"]).default("STUDENTS"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v))).nullable().optional(),
});
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  if (!isLeaderOrHigher(user.role)) return NextResponse.json({ error: "Альбом создаёт староста или администратор" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Проверьте название, дату и описание" }, { status: 400 });
  const album = await prisma.classAlbum.create({ data: { ...parsed.data, createdById: user.id } });
  return NextResponse.json({ album }, { status: 201 });
}
