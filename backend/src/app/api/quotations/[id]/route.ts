import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { quotationSchema, calcItemAmount } from '@/lib/quotation';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!item) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { items, ...data } = parsed.data;

  const itemsWithAmount = items.map((it, idx) => ({
    name: it.name,
    description: it.description ?? null,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    amount: calcItemAmount(it.quantity, it.unitPrice),
    sortOrder: idx,
  }));
  const totalAmount = itemsWithAmount.reduce((s, it) => s + it.amount, 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: params.id } });
    return tx.quotation.update({
      where: { id: params.id },
      data: {
        ...data,
        totalAmount,
        items: { create: itemsWithAmount },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.quotation.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
