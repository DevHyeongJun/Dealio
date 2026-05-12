import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * FILE_STORAGE 경로 해석 우선순위:
 *  1. 환경변수 FILE_STORAGE_PATH (절대/상대 모두 지원)
 *  2. 기본: process.cwd() 기준 '../FILE_STORAGE'
 *     - 로컬 dev (cwd=backend/) → source/FILE_STORAGE
 *     - Docker  (cwd=/app/)    → /FILE_STORAGE (compose 에서 FILE_STORAGE_PATH=/app/FILE_STORAGE 로 오버라이드)
 */
export function getFileStorageRoot(): string {
  const env = process.env.FILE_STORAGE_PATH?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  }
  return path.resolve(process.cwd(), '..', 'FILE_STORAGE');
}

async function ensureRoot(): Promise<string> {
  const root = getFileStorageRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

/**
 * 경로 traversal 방지 — 파일명에서 디렉토리 구분자/상위경로 제거.
 */
function safeName(name: string): string {
  return name.replace(/[\\/]/g, '_').replace(/^\.+/, '_');
}

export async function saveFile(
  storedFilename: string,
  content: Buffer | Uint8Array,
): Promise<string> {
  const root = await ensureRoot();
  const safe = safeName(storedFilename);
  const fullPath = path.join(root, safe);
  await fs.writeFile(fullPath, content);
  return safe;
}

export async function readFile(storedFilename: string): Promise<Buffer | null> {
  const root = await ensureRoot();
  const safe = safeName(storedFilename);
  const fullPath = path.join(root, safe);
  try {
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

export async function deleteFileIfExists(storedFilename: string): Promise<void> {
  const root = await ensureRoot();
  const safe = safeName(storedFilename);
  const fullPath = path.join(root, safe);
  await fs.rm(fullPath, { force: true });
}

export function extensionFromMimetype(mimetype: string): string {
  switch (mimetype) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
