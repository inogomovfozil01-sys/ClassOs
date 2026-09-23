import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isLeaderOrHigher } from "@/lib/auth/rbac";
import { generateLeaderDraft } from "@/lib/ai/leader-ai";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !isLeaderOrHigher(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Текст не может быть пустым" },
        { status: 400 },
      );
    }

    const result = await generateLeaderDraft(text.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Leader draft error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обработки черновика" },
      { status: 500 },
    );
  }
}
