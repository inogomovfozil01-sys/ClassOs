import prisma from "./prisma";
import { Prisma } from "@prisma/client";
export const TABLE_MEMBER_ROLES = ["STUDENT", "LEADER", "ADMIN", "OWNER"];
export function belongsInClassTable(role: string, isBlocked = false) {
  return !isBlocked && TABLE_MEMBER_ROLES.includes(role);
}
export async function syncTableMembers(tableId?: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const users = await tx.user.findMany({
            where: { role: { in: TABLE_MEMBER_ROLES }, isBlocked: false },
            select: { id: true },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
          });
          const tables = await tx.customTable.findMany({
            where: tableId ? { id: tableId } : {},
            select: {
              id: true,
              rows: { select: { studentId: true, orderIndex: true } },
            },
          });
          let count = 0;
          for (const table of tables) {
            const existing = new Set(table.rows.map((r) => r.studentId));
            const start =
              Math.max(-1, ...table.rows.map((r) => r.orderIndex)) + 1;
            const missing = users.filter((u) => !existing.has(u.id));
            if (missing.length) {
              await tx.customTableRow.createMany({
                data: missing.map((u, i) => ({
                  tableId: table.id,
                  studentId: u.id,
                  orderIndex: start + i,
                })),
              });
              count += missing.length;
            }
          }
          return count;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (
        attempt === 2 ||
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2034", "P1008", "P2028"].includes(e.code)
      )
        throw e;
    }
  }
  return 0;
}
