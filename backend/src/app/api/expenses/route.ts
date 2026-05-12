import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { expenseSchema } from '@/lib/expense';

const userBrief = { select: { id: true, name: true, email: true } };
const contractBrief = { select: { id: true, contractNumber: true, title: true } };

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const category = searchParams.get('category');
  const contractId = searchParams.get('contractId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const take = Math.min(Number(searchParams.get('take') ?? 100), 500);
  const skip = Number(searchParams.get('skip') ?? 0);

  const where: Prisma.ExpenseWhereInput = {};
  if (q) {
    where.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { vendor: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category as any;
  if (contractId === 'none') where.contractId = null;
  else if (contractId) where.contractId = contractId;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  const [items, total, sumResult, byCategoryRaw] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      take,
      skip,
      include: {
        contract: contractBrief,
        createdBy: userBrief,
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({
      where,
      by: ['category'],
      _sum: { amount: true },
    }),
  ]);

  const totalAmount = Number(sumResult._sum.amount ?? 0);
  const byCategory = Object.fromEntries(
    byCategoryRaw.map((r) => [r.category, Number(r._sum.amount ?? 0)]),
  );

  return NextResponse.json({ items, total, totalAmount, byCategory });
}

export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // contractId 가 들어왔으면 존재 확인
  if (input.contractId) {
    const exists = await prisma.contract.findUnique({ where: { id: input.contractId } });
    if (!exists) return NextResponse.json({ error: '계약을 찾을 수 없습니다.' }, { status: 400 });
  }

  const created = await prisma.expense.create({
    data: {
      expenseDate: input.expenseDate,
      category: input.category,
      description: input.description,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      vendor: input.vendor ?? null,
      notes: input.notes ?? null,
      contractId: input.contractId ?? null,
      createdById: guard.user.id,
    },
    include: { contract: contractBrief, createdBy: userBrief },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
