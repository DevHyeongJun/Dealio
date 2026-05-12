import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  quotationSchema,
  resolveQuotationSnapshot,
  QuotationResolveError,
} from '@/lib/quotation';
import { requireUser } from '@/lib/auth';
import { recordHistory, statusChangeSummary } from '@/lib/quotationHistory';

const userBrief = { select: { id: true, name: true, email: true } };

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const item = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, isActive: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      sendLogs: {
        orderBy: { sentAt: 'desc' },
        include: { user: userBrief },
      },
      createdBy: userBrief,
      updatedBy: userBrief,
    },
  });
  if (!item) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { customerId: _cid, items: _items, ...rest } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.quotation.findUnique({ where: { id: params.id } });
    if (!before) return null;

    await tx.quotationItem.deleteMany({ where: { quotationId: params.id } });
    const next = await tx.quotation.update({
      where: { id: params.id },
      data: {
        title: rest.title?.trim() || null,
        issueDate: rest.issueDate,
        validUntil: rest.validUntil ?? null,
        status: rest.status,
        notes: rest.notes ?? null,
        vatIncluded: rest.vatIncluded,
        ...resolved.customerSnapshot,
        totalAmount: resolved.totalAmount,
        updatedById: guard.user.id,
        items: { create: resolved.itemsWithSnapshot },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: userBrief,
        updatedBy: userBrief,
      },
    });

    await recordHistory(tx, {
      quotationId: next.id,
      userId: guard.user.id,
      action: 'UPDATE',
      summary: '견적서 수정',
    });
    if (before.status !== next.status) {
      await recordHistory(tx, {
        quotationId: next.id,
        userId: guard.user.id,
        action: 'STATUS_CHANGE',
        summary: statusChangeSummary(before.status, next.status),
        details: { from: before.status, to: next.status },
      });
    }

    // 사용된 품목의 usageCount 증가 (저장 시점에 들어있는 품목 중복 제거 후 1회만)
    const productIds = Array.from(
      new Set(resolved.itemsWithSnapshot.map((it) => it.productId).filter((v): v is string => !!v)),
    );
    if (productIds.length > 0) {
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { usageCount: { increment: 1 } },
      });
    }

    return next;
  });

  if (!updated) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  await prisma.quotation.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
