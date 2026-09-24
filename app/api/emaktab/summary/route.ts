import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
const store = require("@/lib/emaktab-store.cjs");
const headers = { "Cache-Control": "private, no-store, max-age=0" };
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER")
    return NextResponse.json(
      { error: "Заявки доступны только классному руководителю" },
      { status: 403, headers },
    );
  const settings = await prisma.systemSetting.findMany({
    where: { key: { startsWith: store.PREFIX } },
    orderBy: { updatedAt: "desc" },
  });
  const users = await prisma.user.findMany({
    where: {
      id: { in: settings.map((s) => s.key.slice(store.PREFIX.length)) },
      isBlocked: false,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  const people = new Map(users.map((u) => [u.id, u]));
  return NextResponse.json(
    {
      rows: settings.flatMap((s) => {
        const pupil = people.get(s.key.slice(store.PREFIX.length));
        return pupil
          ? [
              {
                ...store.present(store.parseRecord(s.value)),
                userId: pupil.id,
                firstName: pupil.firstName,
                lastName: pupil.lastName,
              },
            ]
          : [];
      }),
    },
    { headers },
  );
}
