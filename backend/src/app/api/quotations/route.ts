import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { quotationSchema, generateQuotationNumber, calcItemAmount } from '@/lib/quotation';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const status = searchParams.get('status');
  const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
  const skip = Number(searchParams.get('skip') ?? 0);

  const where: any = {};
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: 'insensitive' } },
      { quotationNumber: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { _count: { select: { items: true } } },
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
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

  const created = await prisma.quotation.create({
    data: {
      ...data,
      quotationNumber: generateQuotationNumber(),
      totalAmount,
      items: { create: itemsWithAmount },
    },
    include: { items: true },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
