import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { contractSchema, generateContractNumber } from '@/lib/contract';
import { recordContractHistory } from '@/lib/contractHistory';

const userBrief = { select: { id: true, name: true, username: true } };
const customerBrief = { select: { id: true, name: true } };
const quotationBrief = {
  select: { id: true, quotationNumber: true, title: true, customerName: true, totalAmount: true, status: true },
};

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type');
  const paymentStatus = searchParams.get('paymentStatus');
  const take = Math.min(Number(searchParams.get('take') ?? 100), 200);
  const skip = Number(searchParams.get('skip') ?? 0);

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { counterpartyName: { contains: q, mode: 'insensitive' } },
      { contractNumber: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (type) where.type = type;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const [items, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        createdBy: userBrief,
        updatedBy: userBrief,
        customer: customerBrief,
        quotation: quotationBrief,
      },
    }),
    prisma.contract.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
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

  const created = await prisma.contract.create({
    data: {
      contractNumber: generateContractNumber(data.type),
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
      createdById: guard.user.id,
      updatedById: guard.user.id,
    },
    include: {
      createdBy: userBrief,
      updatedBy: userBrief,
      customer: customerBrief,
    },
  });

  await recordContractHistory(prisma, {
    contractId: created.id,
    userId: guard.user.id,
    action: 'CREATE',
    summary: `계약 생성 (${created.contractNumber})`,
    details: { contractNumber: created.contractNumber, customer: customer.name },
  });

  // 견적서로부터 계약 생성된 경우: 견적 상태를 ACCEPTED 로 자동 전환 (성사)
  if (data.quotationId) {
    try {
      const quotation = await prisma.quotation.findUnique({
        where: { id: data.quotationId },
        select: { id: true, status: true },
      });
      if (quotation && quotation.status !== 'ACCEPTED') {
        await prisma.quotation.update({
          where: { id: quotation.id },
          data: { status: 'ACCEPTED', updatedById: guard.user.id },
        });
      }
    } catch {
      // 견적 상태 업데이트 실패해도 계약 생성은 성공 처리
    }
  }

  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
