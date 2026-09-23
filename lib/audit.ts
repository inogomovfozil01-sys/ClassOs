import prisma from '@/lib/prisma';

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
}

export async function logAuditEvent(entry: AuditLogEntry) {
  try {
    const detailsStr = typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details || null;
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        details: detailsStr,
        ipAddress: entry.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
