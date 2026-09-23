import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const post = await prisma.newsPost.findUnique({ where: { id: resourceId } });
    if (!post) {
      return NextResponse.json(
        { error: "Новость не найдена" },
        { status: 404 },
      );
    }

    if (!post.allowComments) {
      return NextResponse.json(
        { error: "Комментарии к этой новости отключены" },
        { status: 403 },
      );
    }

    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Комментарий не может быть пустым" },
        { status: 400 },
      );
    }

    const comment = await prisma.newsComment.create({
      data: {
        postId: resourceId,
        authorId: user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error("Comment error:", error);
    return NextResponse.json(
      { error: "Ошибка отправки комментария" },
      { status: 500 },
    );
  }
}
