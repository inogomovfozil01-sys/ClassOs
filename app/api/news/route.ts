import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canPublishNews } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyAllStudents } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const posts = await prisma.newsPost.findMany({
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        reactions: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const pinned = await prisma.systemSetting.findUnique({
      where: { key: "news.pinned" },
    });
    return NextResponse.json({
      posts: posts
        .map((post) => ({ ...post, isPinned: pinned?.value === post.id }))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
    });
  } catch (error: any) {
    console.error("Fetch news error:", error);
    return NextResponse.json(
      { error: "Ошибка получения новостей" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canPublishNews(user.role)) {
      return NextResponse.json(
        { error: "Недостаточно прав для публикации новостей" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { title, content, category, coverUrl, allowComments, gallery } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Заполните заголовок и текст новости" },
        { status: 400 },
      );
    }

    const post = await prisma.newsPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category?.trim() || "Общее",
        coverUrl: coverUrl || null,
        gallery: gallery ? JSON.stringify(gallery) : null,
        allowComments: allowComments !== false,
        authorId: user.id,
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    await notifyAllStudents({
      type: "NEWS",
      title: `Новость класса: ${post.title}`,
      message: `${post.content.slice(0, 100)}...`,
      link: `/news?post=${post.id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "NEWS_POST_CREATED",
      entity: "NEWS",
      entityId: post.id,
      details: { title: post.title },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("Create news error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания новости" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canPublishNews(user.role))
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const { postId, pinned } = await req.json();
  const post = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!post)
    return NextResponse.json({ error: "Новость не найдена" }, { status: 404 });
  if (pinned)
    await prisma.systemSetting.upsert({
      where: { key: "news.pinned" },
      create: { key: "news.pinned", value: postId },
      update: { value: postId },
    });
  else
    await prisma.systemSetting.deleteMany({
      where: { key: "news.pinned", value: postId },
    });
  return NextResponse.json({ success: true });
}
