const crypto = require("crypto");
const PREFIX = "emaktab.recovery.";
const DELIVERY_MS = 24 * 60 * 60 * 1000;
class RecoveryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function parseRecord(value) {
  return value ? JSON.parse(value) : null;
}
function present(record, now = new Date()) {
  if (!record) return null;
  return {
    id: record.id,
    login: record.login,
    createdAt: record.createdAt,
    status:
      record.status === "READY" && new Date(record.expiresAt) <= now
        ? "EXPIRED"
        : record.status,
    answeredAt: record.answeredAt || null,
    expiresAt: record.expiresAt || null,
    receivedAt: record.receivedAt || null,
  };
}
function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new RecoveryError(
      "Передача пароля пока не настроена. Обратитесь к администратору.",
      503,
    );
  return crypto
    .createHash("sha256")
    .update("classos-recovery-v1\0" + secret)
    .digest();
}
function seal(password, context) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64"))
    .join(".");
}
function unseal(envelope, context) {
  const [iv, tag, data] = envelope
    .split(".")
    .map((s) => Buffer.from(s, "base64"));
  const cipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
async function replace(tx, saved, next) {
  const result = await tx.systemSetting.updateMany({
    where: { key: saved.key, value: saved.value },
    data: { value: JSON.stringify(next) },
  });
  if (result.count !== 1)
    throw new RecoveryError("Заявка уже обновлена. Обновите страницу.", 409);
}
async function act(prisma, user, input, now = new Date()) {
  if (input.action === "issue" && user.role !== "TEACHER")
    throw new RecoveryError(
      "Ответить может только классный руководитель.",
      403,
    );
  const userId = input.action === "issue" ? input.userId : user.id;
  const key = PREFIX + userId;
  return prisma.$transaction(async (tx) => {
    const saved = await tx.systemSetting.findUnique({ where: { key } });
    const record = parseRecord(saved?.value);
    if (input.action === "request") {
      if (user.role === "TEACHER")
        throw new RecoveryError(
          "Этот раздел предназначен для заявок учеников.",
          403,
        );
      const teacher = await tx.user.findFirst({
        where: { role: "TEACHER", isBlocked: false },
        select: { id: true },
      });
      if (!teacher)
        throw new RecoveryError(
          "Классный руководитель ещё не добавлен. Обратитесь к администратору.",
          409,
        );
      if (record && ["PENDING", "READY"].includes(present(record, now).status))
        throw new RecoveryError("У вас уже есть открытая заявка.", 409);
      if (record && now - new Date(record.createdAt) < 60000)
        throw new RecoveryError("Подождите минуту перед новой заявкой.", 429);
      const next = {
        id: crypto.randomUUID(),
        login: input.login,
        status: "PENDING",
        createdAt: now.toISOString(),
      };
      if (saved) await replace(tx, saved, next);
      else
        await tx.systemSetting.create({
          data: { key, value: JSON.stringify(next) },
        });
      await tx.notification.create({
        data: {
          userId: teacher.id,
          type: "SYSTEM",
          title: "Помощь со входом в eMaktab",
          message: `${user.firstName} ${user.lastName} отправляет заявку на восстановление доступа.`,
          link: "/emaktab",
        },
      });
      return { request: present(next, now) };
    }
    if (!record || record.id !== input.requestId)
      throw new RecoveryError("Заявка не найдена или уже заменена новой.", 409);
    if (input.action === "issue") {
      if (record.status !== "PENDING")
        throw new RecoveryError("Эта заявка уже обработана.", 409);
      const pupil = await tx.user.findUnique({
        where: { id: userId },
        select: { isBlocked: true },
      });
      if (!pupil || pupil.isBlocked)
        throw new RecoveryError("Ученик недоступен.", 409);
      const next = {
        ...record,
        status: "READY",
        answeredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + DELIVERY_MS).toISOString(),
        envelope: seal(input.password, key + ":" + record.id),
      };
      await replace(tx, saved, next);
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Учитель ответил на вашу заявку",
          message:
            "В разделе «Забыл пароль» доступен новый временный пароль. Получите его в течение 24 часов.",
          link: "/emaktab",
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "EMAKTAB_RECOVERY_ISSUED",
          entity: "EMAKTAB_RECOVERY",
          entityId: record.id,
        },
      });
      return { request: present(next, now) };
    }
    if (input.action === "collect") {
      if (present(record, now).status !== "READY")
        throw new RecoveryError(
          "Пароль уже получен или срок передачи истёк. При необходимости отправьте новую заявку.",
          409,
        );
      const password = unseal(record.envelope, key + ":" + record.id);
      const { envelope, ...metadata } = record;
      const next = {
        ...metadata,
        status: "RECEIVED",
        receivedAt: now.toISOString(),
      };
      await replace(tx, saved, next);
      return { request: present(next, now), password };
    }
    if (input.action === "cancel") {
      if (!["PENDING", "READY"].includes(present(record, now).status))
        throw new RecoveryError("Эту заявку уже нельзя отменить.", 409);
      const { envelope, ...metadata } = record;
      const next = { ...metadata, status: "CANCELLED" };
      await replace(tx, saved, next);
      return { request: present(next, now) };
    }
    throw new RecoveryError("Неизвестное действие.");
  });
}
// Five-day status reminders are retired. The daily task removes expired deliveries.
async function runReminders(prisma, now = new Date()) {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { startsWith: PREFIX } },
  });
  for (const saved of settings) {
    const record = parseRecord(saved.value);
    if (record.status !== "READY" || new Date(record.expiresAt) > now) continue;
    const { envelope, ...metadata } = record;
    await prisma.systemSetting.updateMany({
      where: { key: saved.key, value: saved.value },
      data: { value: JSON.stringify({ ...metadata, status: "EXPIRED" }) },
    });
  }
}
module.exports = {
  PREFIX,
  DELIVERY_MS,
  RecoveryError,
  parseRecord,
  present,
  seal,
  unseal,
  act,
  runReminders,
};
