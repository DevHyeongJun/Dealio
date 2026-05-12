import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireAdmin } from '@/lib/auth';
import {
  deleteBusinessRegistration,
  getBusinessRegistration,
  setBusinessRegistration,
} from '@/lib/appSetting';
import { deleteFileIfExists, extensionFromMimetype, readFile, saveFile } from '@/lib/fileStorage';

const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 사업자등록증 다운로드/조회
export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const record = await getBusinessRegistration();
  if (!record) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const buffer = await readFile(record.storedFilename);
  if (!buffer) {
    return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 });
  }

  const body = new Uint8Array(buffer);
  const encoded = encodeURIComponent(record.filename);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': record.mimetype,
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `inline; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

// 사업자등록증 업로드 (admin)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: '파일이 첨부되지 않았습니다.' }, { status: 400 });
  }
  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: '파일이 첨부되지 않았습니다.' }, { status: 400 });
  }
  if (fileEntry.size === 0) {
    return NextResponse.json({ error: '빈 파일입니다.' }, { status: 400 });
  }
  if (fileEntry.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIMETYPES.has(fileEntry.type)) {
    return NextResponse.json(
      { error: 'PNG / JPEG / WEBP / PDF 형식만 업로드할 수 있습니다.' },
      { status: 415 },
    );
  }

  // 기존 파일 정리 (있으면)
  const existing = await getBusinessRegistration();
  if (existing) {
    await deleteFileIfExists(existing.storedFilename);
  }

  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extensionFromMimetype(fileEntry.type);
  // 충돌 방지를 위한 timestamp 기반 저장명. 원본 파일명은 메타로 별도 보관.
  const storedFilename = `business-registration-${Date.now()}.${ext}`;

  const written = await saveFile(storedFilename, buffer);

  await setBusinessRegistration({
    filename: fileEntry.name,
    mimetype: fileEntry.type,
    size: fileEntry.size,
    storedFilename: written,
  });

  return NextResponse.json({
    filename: fileEntry.name,
    mimetype: fileEntry.type,
    size: fileEntry.size,
  });
}

// 사업자등록증 삭제 (admin)
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const existing = await getBusinessRegistration();
  if (existing) {
    await deleteFileIfExists(existing.storedFilename);
  }
  await deleteBusinessRegistration();
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
