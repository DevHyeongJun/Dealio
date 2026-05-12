import type { AttachmentEntity, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { saveFile, deleteFileIfExists, extensionFromMimetype } from './fileStorage';

export const ATTACHMENT_ENTITIES: AttachmentEntity[] = [
  'CONTRACT',
  'QUOTATION',
  'EXPENSE',
  'CUSTOMER',
  'USER',
];

export interface UploadAttachmentInput {
  entityType: AttachmentEntity;
  entityId: string;
  file: File;
  uploadedById: string | null;
}

/** 업로드 — 파일을 FILE_STORAGE 에 저장하고 메타정보를 DB 에 기록한다. */
export async function uploadAttachment(
  client: PrismaClient | Prisma.TransactionClient,
  input: UploadAttachmentInput,
) {
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const ext = extensionFromOriginalName(input.file.name) || extensionFromMimetype(input.file.type);
  const storedFilename = `attach_${input.entityType.toLowerCase()}_${input.entityId}_${randomUUID()}.${ext}`;
  await saveFile(storedFilename, buffer);

  return client.attachment.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      filename: input.file.name || `untitled.${ext}`,
      storedFilename,
      mimetype: input.file.type || 'application/octet-stream',
      size: buffer.byteLength,
      uploadedById: input.uploadedById,
    },
    include: { uploadedBy: { select: { id: true, name: true, username: true } } },
  });
}

export async function listAttachments(
  client: PrismaClient | Prisma.TransactionClient,
  entityType: AttachmentEntity,
  entityId: string,
) {
  return client.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { id: true, name: true, username: true } } },
  });
}

export async function getAttachment(
  client: PrismaClient | Prisma.TransactionClient,
  id: string,
) {
  return client.attachment.findUnique({ where: { id } });
}

export async function removeAttachment(
  client: PrismaClient | Prisma.TransactionClient,
  id: string,
): Promise<boolean> {
  const att = await client.attachment.findUnique({ where: { id } });
  if (!att) return false;
  await client.attachment.delete({ where: { id } });
  await deleteFileIfExists(att.storedFilename);
  return true;
}

function extensionFromOriginalName(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx >= name.length - 1) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return null;
  return ext;
}

export function isAttachmentEntity(v: unknown): v is AttachmentEntity {
  return typeof v === 'string' && (ATTACHMENT_ENTITIES as string[]).includes(v);
}
