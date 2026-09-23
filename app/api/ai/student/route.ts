import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { askStudentAI } from "@/lib/ai/student-ai";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Вопрос не может быть пустым" },
        { status: 400 },
      );
    }

    const result = await askStudentAI(prompt.trim(), user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Student AI error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка AI" },
      { status: 500 },
    );
  }
}
