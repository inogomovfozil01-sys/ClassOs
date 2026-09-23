import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isTeacherOrHigher } from "@/lib/auth/rbac";
const store = require("@/lib/emaktab-store.cjs");
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isTeacherOrHigher(user.role))
    return NextResponse.json(
      {
        error:
          "Сводка доступна классному руководителю, старосте и администраторам",
      },
      { status: 403 },
    );
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: store.STUDENT_ROLES }, isBlocked: false },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.systemSetting.findMany({
      where: { key: { startsWith: store.PREFIX } },
    }),
  ]);
  const records = new Map(
    settings.map((s) => [s.key, store.parseRecord(s.value)]),
  );
  return NextResponse.json({
    rows: users.map((u) => ({
      ...u,
      ...store.present(
        records.get(store.PREFIX + u.id) || store.initialRecord(new Date()),
      ),
    })),
  });
}
