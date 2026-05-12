import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { resolveBodyHtml, resolveSubject } from '@/lib/quotationMail';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { product: { select: { unit: true } } },
      },
    },
  });
  if (!quotation) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const subject = await resolveSubject(quotation);
  const html = await resolveBodyHtml(quotation);

  return NextResponse.json({ subject, html });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
