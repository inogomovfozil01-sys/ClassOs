import { describe, it, expect } from 'vitest';
import { sanitizeFileName, ALLOWED_MIME_TYPES } from '../lib/storage';
import { hashPassword, verifyPassword } from '../lib/auth/password';

describe('Security & Storage Utilities', () => {
  it('sanitizes dangerous characters from uploaded filenames', () => {
    const malicious = '../../../etc/passwd.jpg';
    const sanitized = sanitizeFileName(malicious);
    expect(sanitized).not.toContain('/');
    expect(sanitized).not.toContain('..');

    const cyrillic = 'Презентация_по_истории (1).pdf';
    expect(sanitizeFileName(cyrillic)).toBe('Презентация_по_истории__1_.pdf');
  });

  it('validates permitted educational file MIME types', () => {
    expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('audio/webm')).toBe(true);
    expect(ALLOWED_MIME_TYPES.has('application/x-msdownload')).toBe(false);
    expect(ALLOWED_MIME_TYPES.has('application/x-sh')).toBe(false);
  });

  it('safely hashes and verifies passwords using bcrypt', async () => {
    const raw = 'SuperSecureClassPassword2026!';
    const hashed = await hashPassword(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed.startsWith('$2')).toBe(true);

    const match = await verifyPassword(raw, hashed);
    expect(match).toBe(true);

    const wrong = await verifyPassword('WrongPassword', hashed);
    expect(wrong).toBe(false);
  });
});
