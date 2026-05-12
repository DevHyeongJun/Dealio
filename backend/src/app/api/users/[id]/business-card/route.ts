import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth';
import { deleteFileIfExists, extensionFromMimetype, readFile, saveFile } from '@/lib/fileStorage';

const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 명함 이미지 다운로드/조회 (조회는 일반 사용자도 가능)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { businessCardPath: true, businessCardName: true },
  });
  if (!user || !user.businessCardPath) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const buffer = await readFile(user.businessCardPath);
  if (!buffer) {
    return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 });
  }

  const body = new Uint8Array(buffer);
  // mimetype 추정 (저장된 확장자로)
  const ext = user.businessCardPath.split('.').pop()?.toLowerCase();
  const mimetype =
    ext === 'png' ? 'image/png' :
    ext === 'webp' ? 'image/webp' :
    'image/jpeg';

  const filename = user.businessCardName || `business-card.${ext ?? 'jpg'}`;
  const encoded = encodeURIComponent(filename);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': mimetype,
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `inline; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

// 명함 업로드 (admin)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const fileEntry = formData?.get('file');
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
      { error: 'PNG / JPEG / WEBP 이미지만 업로드할 수 있습니다.' },
      { status: 415 },
    );
  }

  // 기존 파일 정리
  if (target.businessCardPath) {
    await deleteFileIfExists(target.businessCardPath);
  }

  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extensionFromMimetype(fileEntry.type);
  const storedFilename = `business-card-${target.id}-${Date.now()}.${ext}`;
  const written = await saveFile(storedFilename, buffer);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      businessCardPath: written,
      businessCardName: fileEntry.name,
    },
  });

  return NextResponse.json({
    filename: fileEntry.name,
    mimetype: fileEntry.type,
    size: fileEntry.size,
  });
}

// 명함 삭제 (admin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { businessCardPath: true },
  });
  if (!target) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (target.businessCardPath) {
    await deleteFileIfExists(target.businessCardPath);
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { businessCardPath: null, businessCardName: null },
  });

  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
