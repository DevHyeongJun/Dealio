import { NextRequest, NextResponse } from 'next/server';
import type { AttachmentEntity } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import {
  isAttachmentEntity,
  listAttachments,
  uploadAttachment,
} from '@/lib/attachment';

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

/** GET /api/attachments?entityType=CONTRACT&entityId=xxx */
export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get('entityType');
  const entityId = sp.get('entityId');
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType, entityId 필수' }, { status: 400 });
  }
  if (!isAttachmentEntity(entityType)) {
    return NextResponse.json({ error: '지원하지 않는 entityType' }, { status: 400 });
  }

  const items = await listAttachments(prisma, entityType as AttachmentEntity, entityId);
  return NextResponse.json({ items });
}

/** POST /api/attachments  (multipart/form-data: entityType, entityId, file) */
export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart/form-data 필요' }, { status: 400 });
  }
  const form = await req.formData();
  const entityType = form.get('entityType');
  const entityId = form.get('entityId');
  const file = form.get('file');

  if (typeof entityType !== 'string' || typeof entityId !== 'string') {
    return NextResponse.json({ error: 'entityType, entityId 필수' }, { status: 400 });
  }
  if (!isAttachmentEntity(entityType)) {
    return NextResponse.json({ error: '지원하지 않는 entityType' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file 필수' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일 크기가 ${Math.floor(MAX_BYTES / 1024 / 1024)}MB 를 초과합니다.` },
      { status: 413 },
    );
  }

  // 엔티티 존재 검증 (계약/견적서 등)
  const exists = await entityExists(entityType as AttachmentEntity, entityId);
  if (!exists) {
    return NextResponse.json({ error: '대상 항목을 찾을 수 없습니다.' }, { status: 404 });
  }

  const created = await uploadAttachment(prisma, {
    entityType: entityType as AttachmentEntity,
    entityId,
    file,
    uploadedById: guard.user.id,
  });
  return NextResponse.json(created, { status: 201 });
}

async function entityExists(entityType: AttachmentEntity, id: string): Promise<boolean> {
  switch (entityType) {
    case 'CONTRACT':
      return !!(await prisma.contract.findUnique({ where: { id }, select: { id: true } }));
    case 'QUOTATION':
      return !!(await prisma.quotation.findUnique({ where: { id }, select: { id: true } }));
    case 'EXPENSE':
      return !!(await prisma.expense.findUnique({ where: { id }, select: { id: true } }));
    case 'CUSTOMER':
      return !!(await prisma.customer.findUnique({ where: { id }, select: { id: true } }));
    case 'USER':
      return !!(await prisma.user.findUnique({ where: { id }, select: { id: true } }));
    default:
      return false;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
