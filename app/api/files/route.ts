import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const subjectId = searchParams.get("subjectId");

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { parentId: folderId || null },
        include: { subject: true, _count: { select: { files: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.fileAsset.findMany({
        where: subjectId ? { subjectId } : { folderId: folderId || null },
        include: {
          uploader: { select: { firstName: true, lastName: true } },
          subject: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ folders, files });
  } catch (error: any) {
    console.error("Fetch files error:", error);
    return NextResponse.json(
      { error: "Ошибка получения файлов" },
      { status: 500 },
    );
  }
}
