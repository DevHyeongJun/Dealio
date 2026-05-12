import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getAttachment, removeAttachment } from '@/lib/attachment';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const att = await getAttachment(prisma, params.id);
  if (!att) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(att);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const ok = await removeAttachment(prisma, params.id);
  if (!ok) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
