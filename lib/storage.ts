import prisma from './prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'storage', 'uploads');

// Ensure upload directory exists
if (!process.env.VERCEL && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Max 50 MB
export const MAX_FILE_SIZE = (process.env.VERCEL ? 4 : 50) * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  // Audio & Video
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'video/mp4',
  'video/webm',
]);

export function sanitizeFileName(name: string): string {
  return name.replace(/\.\./g, '_').replace(/[^a-zA-Z0-9._\-а-яА-Я]/g, '_');
}

export async function saveUploadedFile(fileBuffer: Buffer, originalName: string, mimeType: string) {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`Размер файла превышает лимит ${MAX_FILE_SIZE / 1024 / 1024} МБ`);
  }

  const ext = path.extname(originalName) || '.bin';
  const randomKey = crypto.randomBytes(16).toString('hex');
  const safeFilename = `${Date.now()}-${randomKey}${ext}`;
  const filePath = path.join(UPLOAD_DIR, safeFilename);

  if (process.env.VERCEL) await prisma.storedFile.create({data:{key:safeFilename,data:fileBuffer}});
  else await fs.promises.writeFile(filePath, fileBuffer);

  return {
    storageKey: safeFilename,
    filePath,
    size: fileBuffer.length,
    mimeType: ALLOWED_MIME_TYPES.has(mimeType) ? mimeType : 'application/octet-stream',
    fileName: sanitizeFileName(originalName),
  };
}

export function getFilePath(storageKey: string): string | null {
  // Prevent path traversal
  const safeKey = path.basename(storageKey);
  const fullPath = path.join(UPLOAD_DIR, safeKey);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export async function readStoredFile(key:string):Promise<Buffer|null>{
  if(process.env.VERCEL){const stored=await prisma.storedFile.findUnique({where:{key}});return stored?Buffer.from(stored.data):null;}
  const filePath=getFilePath(key);return filePath?fs.promises.readFile(filePath):null;
}

export async function removeStoredFile(key: string) {
  if (path.basename(key) !== key) throw Error('Invalid storage key');
  if (process.env.VERCEL) await prisma.storedFile.deleteMany({where: {key}});
  else await fs.promises.unlink(path.join(UPLOAD_DIR, key)).catch((error) => {if (error.code !== 'ENOENT') throw error;});
}
