import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isValidLatinName } from "@/lib/username-ai";

type Context = { params: Promise<{ id: string }> };

const SETTING_KEY = "class_stories";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function GET(_: Request, ctx: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    const { id } = await ctx.params;

    const profile = await prisma.user.findFirst({
      where: { id, isBlocked: false },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!profile) return NextResponse.json({ error: "Профиль недоступен" }, { status: 404 });

    // Fetch active stories of this specific user
    let userStories: any[] = [];
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      if (setting?.value) {
        const allStories = JSON.parse(setting.value);
        if (Array.isArray(allStories)) {
          const now = Date.now();
          userStories = allStories.filter(
            (s: any) =>
              s &&
              s.userId === id &&
              s.createdAt &&
              now - new Date(s.createdAt).getTime() < TWENTY_FOUR_HOURS_MS,
          );
        }
      }
    } catch (err) {
      console.error("Error reading user stories:", err);
    }

    return NextResponse.json({ profile, stories: userStories });
  } catch (error: any) {
    console.error("GET /api/profiles/[id] error:", error);
    return NextResponse.json({ error: error.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
    const { id } = await ctx.params;

    if (id !== user.id && !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Можно редактировать только свой профиль" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Пустое тело запроса" }, { status: 400 });

    const dataToUpdate: any = {};

    if (typeof body.bio === "string") {
      if (body.bio.trim().length > 300) {
        return NextResponse.json({ error: "Описание — не более 300 символов" }, { status: 400 });
      }
      dataToUpdate.bio = body.bio.trim();
    }

    if (typeof body.firstName === "string") {
      const clean = body.firstName.trim();
      if (!isValidLatinName(clean)) {
        return NextResponse.json(
          { error: "Имя должно быть написано только английскими буквами (латиницей)" },
          { status: 400 },
        );
      }
      dataToUpdate.firstName = clean;
    }

    if (typeof body.lastName === "string") {
      const clean = body.lastName.trim();
      if (!isValidLatinName(clean)) {
        return NextResponse.json(
          { error: "Фамилия должна быть написана только английскими буквами (латиницей)" },
          { status: 400 },
        );
      }
      dataToUpdate.lastName = clean;
    }

    if (typeof body.middleName === "string") {
      dataToUpdate.middleName = body.middleName.trim() || null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        middleName: true,
        role: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error("PATCH /api/profiles/[id] error:", error);
    return NextResponse.json({ error: error.message || "Ошибка обновления профиля" }, { status: 500 });
  }
}
