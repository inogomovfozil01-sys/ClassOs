import { NextResponse } from "next/server";
import { generateSmartUsername } from "@/lib/username-ai";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firstName = searchParams.get("firstName")?.trim() || "";
    const lastName = searchParams.get("lastName")?.trim() || "";

    if (!firstName && !lastName) {
      return NextResponse.json({ username: "", suggestions: [] });
    }

    const result = await generateSmartUsername(firstName, lastName);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Suggest username error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации логина" },
      { status: 500 },
    );
  }
}
