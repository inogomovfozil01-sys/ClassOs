import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const subjectId = formData.get("subjectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUploadedFile(buffer, file.name, file.type);

    const asset = await prisma.fileAsset.create({
      data: {
        name: saved.fileName,
        size: saved.size,
        mimeType: saved.mimeType,
        storagePath: saved.storageKey,
        folderId: folderId || null,
        subjectId: subjectId || null,
        uploaderId: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "FILE_UPLOADED",
      entity: "FILE",
      entityId: asset.id,
      details: { name: asset.name, size: asset.size },
    });

    return NextResponse.json({
      success: true,
      file: {
        ...asset,
        downloadUrl: `/api/files/${asset.id}`,
      },
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка загрузки файла" },
      { status: 500 },
    );
  }
}
