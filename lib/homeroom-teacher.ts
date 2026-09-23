import { Prisma } from "@prisma/client";
export class HomeroomTeacherConflict extends Error {
  constructor() {
    super(
      "В классе уже есть классный руководитель. Измените роль прежнего аккаунта перед назначением нового.",
    );
  }
}
export async function ensureSingleHomeroomTeacher(
  tx: Prisma.TransactionClient,
  role?: string,
  userId?: string,
) {
  if (role !== "TEACHER") return;
  const existing = await tx.user.findFirst({
    where: { role: "TEACHER", ...(userId ? { id: { not: userId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new HomeroomTeacherConflict();
}
