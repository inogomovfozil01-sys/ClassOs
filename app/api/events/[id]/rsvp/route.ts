import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { status } = await req.json();
    if (!status || !["GOING", "NOT_GOING", "UNSURE"].includes(status)) {
      return NextResponse.json(
        { error: "Некорректный статус RSVP" },
        { status: 400 },
      );
    }

    const rsvp = await prisma.eventRSVP.upsert({
      where: {
        eventId_userId: {
          eventId: params.id,
          userId: user.id,
        },
      },
      update: { status },
      create: {
        eventId: params.id,
        userId: user.id,
        status,
      },
    });

    return NextResponse.json({ success: true, rsvp });
  } catch (error: any) {
    console.error("RSVP error:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения ответа" },
      { status: 500 },
    );
  }
}
