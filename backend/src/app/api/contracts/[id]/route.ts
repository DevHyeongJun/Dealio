import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { contractSchema } from '@/lib/contract';
import { diffContract, paymentStatusChangeSummary, recordContractHistory } from '@/lib/contractHistory';

const userBrief = { select: { id: true, name: true, username: true } };
const customerBrief = { select: { id: true, name: true } };
const quotationBrief = {
  select: { id: true, quotationNumber: true, title: true, customerName: true, totalAmount: true, status: true },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const item = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      createdBy: userBrief,
      updatedBy: userBrief,
      customer: customerBrief,
      quotation: quotationBrief,
    },
  });
  if (!item) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = contractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    return NextResponse.json({ error: '존재하지 않는 거래처입니다.' }, { status: 400 });
  }

  const before = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  try {
    const updated = await prisma.contract.update({
      where: { id: params.id },
      data: {
        title: data.title,
        type: data.type,
        counterpartyName: customer.name,
        customerId: data.customerId,
        quotationId: data.quotationId ?? null,
        amount: data.amount,
        vatIncluded: data.vatIncluded,
        paidAmount: data.paidAmount,
        paymentStatus: data.paymentStatus,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        notes: data.notes ?? null,
        updatedById: guard.user.id,
      },
      include: {
        createdBy: userBrief,
        updatedBy: userBrief,
        customer: customerBrief,
        quotation: quotationBrief,
      },
    });

    const { changed, details } = diffContract(before, updated);
    if (changed.length > 0) {
      const statusChanged = before.paymentStatus !== updated.paymentStatus;
      await prisma.$transaction(async (tx) => {
        await recordContractHistory(tx, {
          contractId: updated.id,
          userId: guard.user.id,
          action: 'UPDATE',
          summary: `수정: ${changed.join(', ')}`,
          details: details as Prisma.InputJsonValue,
        });
        if (statusChanged) {
          await recordContractHistory(tx, {
            contractId: updated.id,
            userId: guard.user.id,
            action: 'PAYMENT_STATUS_CHANGE',
            summary: paymentStatusChangeSummary(before.paymentStatus, updated.paymentStatus),
            details: { from: before.paymentStatus, to: updated.paymentStatus },
          });
        }
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  try {
    await prisma.contract.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    throw e;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
