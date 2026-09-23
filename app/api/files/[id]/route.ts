import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getFilePath } from "@/lib/storage";
import fs from "fs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const file = await prisma.fileAsset.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    const absolutePath = getFilePath(file.storagePath);
    if (!absolutePath) {
      return new NextResponse("File storage missing", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
