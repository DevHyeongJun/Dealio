import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  quotationSchema,
  generateQuotationNumber,
  resolveQuotationSnapshot,
  QuotationResolveError,
} from '@/lib/quotation';
import { requireUser } from '@/lib/auth';
import { recordHistory } from '@/lib/quotationHistory';

const userBrief = { select: { id: true, name: true, email: true } };

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

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
      include: {
        _count: { select: { items: true } },
        createdBy: userBrief,
        updatedBy: userBrief,
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let resolved;
  try {
    resolved = await resolveQuotationSnapshot(parsed.data);
  } catch (e) {
    if (e instanceof QuotationResolveError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
  const { customerId, ...input } = parsed.data;
  const { items: _items, ...rest } = input;

  const created = await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.create({
      data: {
        title: rest.title?.trim() || null,
        issueDate: rest.issueDate,
        validUntil: rest.validUntil ?? null,
        status: rest.status,
        notes: rest.notes ?? null,
        vatIncluded: rest.vatIncluded,
        ...resolved.customerSnapshot,
        quotationNumber: generateQuotationNumber(),
        totalAmount: resolved.totalAmount,
        createdById: guard.user.id,
        updatedById: guard.user.id,
        items: { create: resolved.itemsWithSnapshot },
      },
      include: {
        items: true,
        createdBy: userBrief,
        updatedBy: userBrief,
      },
    });
    await recordHistory(tx, {
      quotationId: quotation.id,
      userId: guard.user.id,
      action: 'CREATE',
      summary: '견적서 생성',
    });
    // 사용된 품목의 usageCount 증가 (한 견적서에 같은 품목이 여러 번 들어가도 1회만 카운트)
    const productIds = Array.from(
      new Set(resolved.itemsWithSnapshot.map((it) => it.productId).filter((v): v is string => !!v)),
    );
    if (productIds.length > 0) {
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { usageCount: { increment: 1 } },
      });
    }
    return quotation;
  });

  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
