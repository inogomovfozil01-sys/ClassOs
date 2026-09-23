import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessJarvis } from "@/lib/auth/rbac";
import { processJarvisMessage } from "@/lib/ai/jarvis-tools";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessJarvis(user.role)) {
      return NextResponse.json(
        { error: "Доступ к JARVIS запрещён" },
        { status: 403 },
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Запрос не может быть пустым" },
        { status: 400 },
      );
    }

    const result = await processJarvisMessage(query.trim(), user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("JARVIS API error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обработки JARVIS" },
      { status: 500 },
    );
  }
}
