export type Role = "OWNER" | "ADMIN" | "LEADER" | "TEACHER" | "STUDENT";

export const ROLES: Record<Role, Role> = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  LEADER: "LEADER",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
};

export function isOwner(role?: string | null): boolean {
  return role === "OWNER";
}

export function isAdminOrOwner(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isLeaderOrHigher(role?: string | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "LEADER";
}

export function isTeacherOrHigher(role?: string | null): boolean {
  return (
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "LEADER" ||
    role === "TEACHER"
  );
}

export function canManageUsers(role?: string | null): boolean {
  return isAdminOrOwner(role);
}

export function canEditSchedule(role?: string | null): boolean {
  return isLeaderOrHigher(role);
}

export function canPublishHomework(role?: string | null): boolean {
  return isTeacherOrHigher(role);
}

export function canPublishNews(role?: string | null): boolean {
  return isTeacherOrHigher(role);
}

export function canManageEvents(role?: string | null): boolean {
  return isTeacherOrHigher(role);
}

export function canManageDuty(role?: string | null): boolean {
  return isLeaderOrHigher(role);
}

export function canManageTables(role?: string | null): boolean {
  return isTeacherOrHigher(role);
}

export function canAccessClassFiles(role?: string | null): boolean {
  if (!role) return false;
  return role !== "TEACHER";
}

export function canAccessJarvis(role?: string | null): boolean {
  return isAdminOrOwner(role);
}

export function canAccessLeaderAI(role?: string | null): boolean {
  return isLeaderOrHigher(role);
}

export function canAccessStudentAI(role?: string | null): boolean {
  return Boolean(role); // All authenticated roles can use student academic helper
}

export function getRoleBadgeColor(role?: string | null): string {
  switch (role) {
    case "OWNER":
      return "bg-surface-elevated text-foreground-muted border-border";
    case "ADMIN":
      return "bg-surface-elevated text-foreground-muted border-border";
    case "LEADER":
      return "bg-surface-elevated text-foreground-muted border-border";
    case "TEACHER":
      return "bg-surface-elevated text-foreground-muted border-border";
    case "STUDENT":
    default:
      return "bg-surface-elevated text-foreground-muted border-border";
  }
}

export function getRoleDisplayName(role?: string | null): string {
  switch (role) {
    case "OWNER":
      return "Владелец";
    case "ADMIN":
      return "Администратор";
    case "LEADER":
      return "Лидер класса";
    case "TEACHER":
      return "Классный руководитель";
    case "STUDENT":
      return "Ученик";
    default:
      return "Гость";
  }
}
