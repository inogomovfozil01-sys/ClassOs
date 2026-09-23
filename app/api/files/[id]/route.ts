import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const {id: resourceId} = await params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const file = await prisma.fileAsset.findUnique({
      where: { id: resourceId },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await readStoredFile(file.storagePath);
    if(!fileBuffer) return new NextResponse("File storage missing",{status:404});
    return new NextResponse(new Uint8Array(fileBuffer), {
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
