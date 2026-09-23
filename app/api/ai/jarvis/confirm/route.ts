import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessJarvis } from "@/lib/auth/rbac";
import { executeConfirmedAction } from "@/lib/ai/jarvis-tools";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessJarvis(user.role)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { tool, params } = await req.json();

    if (!tool || !params) {
      return NextResponse.json(
        { error: "Некорректные параметры действия" },
        { status: 400 },
      );
    }

    const result = await executeConfirmedAction(tool, params, user.id);

    // Audit log this AI-triggered confirmed action
    await logAuditEvent({
      userId: user.id,
      action: `JARVIS_ACTION_EXECUTED:${tool}`,
      entity: tool.includes("User")
        ? "USER"
        : tool.includes("News")
          ? "NEWS"
          : "AI_ACTION",
      details: params,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("JARVIS confirm error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка выполнения действия" },
      { status: 500 },
    );
  }
}
