import { describe, it, expect } from 'vitest';
import {
  isOwner,
  isAdminOrOwner,
  isLeaderOrHigher,
  isTeacherOrHigher,
  canManageUsers,
  canEditSchedule,
  canPublishHomework,
  canPublishNews,
  canAccessJarvis,
  canAccessLeaderAI,
  canAccessStudentAI,
  canAccessClassFiles,
} from '../lib/auth/rbac';

describe('RBAC Permission Matrix', () => {
  it('enforces OWNER special privileges', () => {
    expect(isOwner('OWNER')).toBe(true);
    expect(isOwner('ADMIN')).toBe(false);
    expect(isOwner('STUDENT')).toBe(false);
  });

  it('allows only ADMIN or OWNER to manage users and access JARVIS', () => {
    expect(canManageUsers('OWNER')).toBe(true);
    expect(canManageUsers('ADMIN')).toBe(true);
    expect(canManageUsers('LEADER')).toBe(false);
    expect(canManageUsers('TEACHER')).toBe(false);
    expect(canManageUsers('STUDENT')).toBe(false);

    expect(canAccessJarvis('OWNER')).toBe(true);
    expect(canAccessJarvis('ADMIN')).toBe(true);
    expect(canAccessJarvis('LEADER')).toBe(false);
    expect(canAccessJarvis('STUDENT')).toBe(false);
  });

  it('allows LEADER, ADMIN, and OWNER to edit schedule and access Leader AI', () => {
    expect(canEditSchedule('OWNER')).toBe(true);
    expect(canEditSchedule('ADMIN')).toBe(true);
    expect(canEditSchedule('LEADER')).toBe(true);
    expect(canEditSchedule('TEACHER')).toBe(false);
    expect(canEditSchedule('STUDENT')).toBe(false);

    expect(canAccessLeaderAI('LEADER')).toBe(true);
    expect(canAccessLeaderAI('STUDENT')).toBe(false);
  });

  it('allows TEACHER and above to publish homework and news', () => {
    expect(canPublishHomework('TEACHER')).toBe(true);
    expect(canPublishHomework('LEADER')).toBe(true);
    expect(canPublishHomework('ADMIN')).toBe(true);
    expect(canPublishHomework('OWNER')).toBe(true);
    expect(canPublishHomework('STUDENT')).toBe(false);

    expect(canPublishNews('TEACHER')).toBe(true);
    expect(canPublishNews('STUDENT')).toBe(false);
  });

  it('allows all authenticated users to access Student Academic AI', () => {
    expect(canAccessStudentAI('STUDENT')).toBe(true);
    expect(canAccessStudentAI('LEADER')).toBe(true);
    expect(canAccessStudentAI('TEACHER')).toBe(true);
    expect(canAccessStudentAI(null)).toBe(false);
  });

  it('restricts TEACHER from accessing class files', () => {
    expect(canAccessClassFiles('TEACHER')).toBe(false);
    expect(canAccessClassFiles('STUDENT')).toBe(true);
    expect(canAccessClassFiles('LEADER')).toBe(true);
    expect(canAccessClassFiles('ADMIN')).toBe(true);
    expect(canAccessClassFiles('OWNER')).toBe(true);
    expect(canAccessClassFiles(null)).toBe(false);
  });
});
