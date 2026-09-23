const INTERVAL_MS = 5 * 24 * 60 * 60 * 1000;
const PREFIX = "emaktab.access.";
const STUDENT_ROLES = ["STUDENT", "LEADER"];
function parseRecord(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function initialRecord(now) {
  return {
    status: "UNCONFIRMED",
    confirmedAt: null,
    nextReminderAt: new Date(now.getTime() + INTERVAL_MS).toISOString(),
  };
}
function present(record, now = new Date()) {
  return {
    ...record,
    needsConfirmation:
      !record.confirmedAt ||
      now.getTime() - new Date(record.confirmedAt).getTime() >= INTERVAL_MS,
  };
}
async function runReminders(prisma, now = new Date()) {
  const users = await prisma.user.findMany({
    where: { role: { in: STUDENT_ROLES }, isBlocked: false },
    select: { id: true },
  });
  for (const user of users)
    await prisma.$transaction(async (tx) => {
      const key = PREFIX + user.id;
      const stored = await tx.systemSetting.findUnique({ where: { key } });
      const record = stored ? parseRecord(stored.value) : null;
      if (!record) {
        await tx.systemSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(initialRecord(now)) },
          update: { value: JSON.stringify(initialRecord(now)) },
        });
        return;
      }
      if (new Date(record.nextReminderAt).getTime() > now.getTime()) return;
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Подтвердите доступ к eMaktab",
          message:
            "Проверьте, что можете войти в eMaktab. Отметьте «Доступ работает» или «Нужна помощь». Пароль вводить не нужно.",
          link: "/emaktab",
        },
      });
      await tx.systemSetting.update({
        where: { key },
        data: {
          value: JSON.stringify({
            ...record,
            nextReminderAt: new Date(now.getTime() + INTERVAL_MS).toISOString(),
          }),
        },
      });
    });
}
module.exports = {
  INTERVAL_MS,
  PREFIX,
  STUDENT_ROLES,
  parseRecord,
  initialRecord,
  present,
  runReminders,
};
