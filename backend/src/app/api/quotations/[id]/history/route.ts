import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const items = await prisma.quotationHistory.findMany({
    where: { quotationId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ items });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
