import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { expenseSchema } from '@/lib/expense';

const userBrief = { select: { id: true, name: true, email: true } };
const contractBrief = { select: { id: true, contractNumber: true, title: true } };

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: { contract: contractBrief, createdBy: userBrief },
  });
  if (!expense) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  if (input.contractId) {
    const exists = await prisma.contract.findUnique({ where: { id: input.contractId } });
    if (!exists) return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 400 });
  }

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: {
      expenseDate: input.expenseDate,
      category: input.category,
      description: input.description,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      vendor: input.vendor ?? null,
      notes: input.notes ?? null,
      contractId: input.contractId ?? null,
    },
    include: { contract: contractBrief, createdBy: userBrief },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  await prisma.expense.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
