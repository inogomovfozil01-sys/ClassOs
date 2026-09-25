import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageUsers, canAccessClassFiles } from "@/lib/auth/rbac";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [homework, subjects, news, events, files, users] = await Promise.all([
      // Homework
      prisma.homework.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        include: { subject: { select: { name: true } } },
        take: 5,
      }),
      // Subjects
      prisma.subject.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { shortName: { contains: query } },
          ],
        },
        take: 5,
      }),
      // News
      prisma.newsPost.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        take: 5,
      }),
      // Events
      prisma.classEvent.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: 5,
      }),
      // Files
      canAccessClassFiles(user.role)
        ? prisma.fileAsset.findMany({
            where: {
              name: { contains: query },
            },
            take: 5,
          })
        : Promise.resolve([]),
      // Users (only if authorized to view or simple directory)
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { username: { contains: query } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          username: true,
        },
        take: 5,
      }),
    ]);

    const formatted = [
      ...homework.map((h) => ({
        id: `hw-${h.id}`,
        title: h.title,
        category: "Домашнее задание",
        subtitle: `${h.subject.name} • Срок: ${h.dueDate.toISOString().split("T")[0]}`,
        href: `/homework/${h.id}`,
      })),
      ...subjects.map((s) => ({
        id: `sub-${s.id}`,
        title: s.name,
        category: "Предмет",
        subtitle: s.shortName,
        href: `/subjects/${s.id}`,
      })),
      ...news.map((n) => ({
        id: `news-${n.id}`,
        title: n.title,
        category: "Новость",
        subtitle: n.category,
        href: `/news?post=${n.id}`,
      })),
      ...events.map((e) => ({
        id: `event-${e.id}`,
        title: e.title,
        category: "Событие",
        subtitle: `${e.date} ${e.time || ""}`,
        href: "/events",
      })),
      ...files.map((f) => ({
        id: `file-${f.id}`,
        title: f.name,
        category: "Файл",
        subtitle: `${Math.round(f.size / 1024)} КБ`,
        href: "/files",
      })),
      ...users.map((u) => ({
        id: `user-${u.id}`,
        title: `${u.lastName} ${u.firstName}`,
        category: "Пользователь",
        subtitle: u.role,
        href: canManageUsers(user.role) ? "/admin/users" : "/chats",
      })),
    ];

    return NextResponse.json({ results: formatted });
  } catch (error: any) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Ошибка поиска" }, { status: 500 });
  }
}
