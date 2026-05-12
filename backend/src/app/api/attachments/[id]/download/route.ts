import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getAttachment } from '@/lib/attachment';
import { readFile } from '@/lib/fileStorage';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const att = await getAttachment(prisma, params.id);
  if (!att) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const buf = await readFile(att.storedFilename);
  if (!buf) return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 });

  const body = new Uint8Array(buf);
  // 한글 파일명: RFC 5987 filename* 사용
  const safeAscii = att.filename.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(att.filename);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': att.mimetype || 'application/octet-stream',
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
