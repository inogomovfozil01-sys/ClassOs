import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { canManageEvents } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit";
import { notifyAllStudents } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const events = await prisma.classEvent.findMany({
      include: {
        author: { select: { firstName: true, lastName: true } },
        rsvps: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const formatted = events.map((ev) => {
      const userRsvp =
        ev.rsvps.find((r) => r.userId === user.id)?.status || null;
      const counts = {
        going: ev.rsvps.filter((r) => r.status === "GOING").length,
        notGoing: ev.rsvps.filter((r) => r.status === "NOT_GOING").length,
        unsure: ev.rsvps.filter((r) => r.status === "UNSURE").length,
      };

      return {
        ...ev,
        userRsvp,
        counts,
      };
    });

    return NextResponse.json({ events: formatted });
  } catch (error: any) {
    console.error("Fetch events error:", error);
    return NextResponse.json(
      { error: "Ошибка получения событий" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageEvents(user.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, date, time, location, rsvpEnabled } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "Укажите название и дату события" },
        { status: 400 },
      );
    }

    const event = await prisma.classEvent.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        date,
        time: time?.trim() || null,
        location: location?.trim() || null,
        rsvpEnabled: rsvpEnabled !== false,
        authorId: user.id,
      },
    });

    await notifyAllStudents({
      type: "EVENT",
      title: `Событие класса: ${event.title}`,
      message: `${date} ${time || ""} • ${location || "Место уточняется"}`,
      link: `/events?date=${date}&event=${event.id}`,
    });

    await logAuditEvent({
      userId: user.id,
      action: "CLASS_EVENT_CREATED",
      entity: "EVENT",
      entityId: event.id,
      details: { title: event.title, date: event.date },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка создания события" },
      { status: 500 },
    );
  }
}
