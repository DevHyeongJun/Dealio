import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  // 유형 × 정산상태 별 합계 + 건수
  const groups = await prisma.contract.groupBy({
    by: ['type', 'paymentStatus'],
    _sum: { amount: true, paidAmount: true },
    _count: { _all: true },
  });

  const buckets = {
    total: { contractAmount: 0, paidAmount: 0, count: 0 },
    sales: { contractAmount: 0, paidAmount: 0, count: 0, paid: 0, partial: 0, unpaid: 0, outstanding: 0 },
    outsourcing: { contractAmount: 0, paidAmount: 0, count: 0, paid: 0, partial: 0, unpaid: 0, outstanding: 0 },
  };

  for (const g of groups) {
    const amount = Number(g._sum.amount ?? 0);
    const paid = Number(g._sum.paidAmount ?? 0);
    const count = g._count._all;
    const bucket = g.type === 'SALES' ? buckets.sales : buckets.outsourcing;

    bucket.contractAmount += amount;
    bucket.paidAmount += paid;
    bucket.count += count;
    bucket.outstanding += amount - paid;

    if (g.paymentStatus === 'PAID') bucket.paid += amount;
    else if (g.paymentStatus === 'PARTIAL') bucket.partial += amount;
    else bucket.unpaid += amount;

    buckets.total.contractAmount += amount;
    buckets.total.paidAmount += paid;
    buckets.total.count += count;
  }

  return NextResponse.json(buckets);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
