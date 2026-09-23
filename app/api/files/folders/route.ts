import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { isLeaderOrHigher } from "@/lib/auth/rbac";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { name, parentId, subjectId } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Укажите название папки" },
        { status: 400 },
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        subjectId: subjectId || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    console.error("Create folder error:", error);
    return NextResponse.json(
      { error: "Ошибка создания папки" },
      { status: 500 },
    );
  }
}
