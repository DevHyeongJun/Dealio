import { prisma } from './prisma';

/**
 * 대시보드 집계 — 올해(calendar year) 기준.
 * 계약의 "기준일" 은 startDate (있으면) → 없으면 createdAt 으로 폴백.
 */

function yearRange(year: number) {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);
  return { start, end };
}

interface RevenueAgg {
  salesTotal: number;
  salesPaid: number;
  salesUnpaid: number;
  outsourcingTotal: number;
  outsourcingPaid: number;
  outsourcingUnpaid: number;
  netTotal: number; // 수주 - 외주
  netPaid: number; // 수주 정산 - 외주 정산
}

export interface MonthlyPoint {
  month: number; // 1..12
  salesPaid: number;
  salesUnpaid: number;
  outsourcingPaid: number;
  outsourcingUnpaid: number;
  net: number;
  expense: number;
  /** 누적 표시용 — 12 포인트 모두 채워서 반환 */
  salesPaidCum: number;
  salesUnpaidCum: number;
  salesTotalCum: number;
  outsourcingPaidCum: number;
  outsourcingUnpaidCum: number;
  outsourcingTotalCum: number;
  netCum: number;
  expenseCum: number;
  /** 파생 — 들어온 돈(=수주 정산 누적) */
  cashInCum: number;
  /** 파생 — 나간 돈(=외주 정산 누적 + 경비 누적) */
  cashOutCum: number;
  /** 수주 누적 - 경비 누적 */
  salesMinusExpenseCum: number;
  /** 순수주 누적 - 경비 누적 */
  netMinusExpenseCum: number;
}

export interface TopCustomer {
  customerId: string | null;
  name: string;
  totalAmount: number;
  paidAmount: number;
  count: number;
}

export interface DashboardResponse {
  year: number;
  generatedAt: string;
  revenue: RevenueAgg;
  monthly: MonthlyPoint[];
  topCustomers: TopCustomer[];
  expenseTotal: number;
  expenseByCategory: Record<string, number>;
  quotationStatusCounts: Record<string, number>;
  expiringQuotations: {
    id: string;
    quotationNumber: string;
    title: string | null;
    customerName: string;
    validUntil: string;
    totalAmount: number;
  }[];
  recentActivity: {
    type: 'QUOTATION_CREATED' | 'QUOTATION_SENT' | 'CONTRACT_CREATED' | 'EXPENSE_CREATED';
    at: string;
    title: string;
    subtitle: string | null;
    link: string;
  }[];
}

export async function buildDashboard(year: number = new Date().getFullYear()): Promise<DashboardResponse> {
  const { start, end } = yearRange(year);

  // 1) 올해 계약 (매출/외주) — startDate 우선, 없으면 createdAt 으로 분류
  const contracts = await prisma.contract.findMany({
    where: {
      OR: [
        { startDate: { gte: start, lt: end } },
        { AND: [{ startDate: null }, { createdAt: { gte: start, lt: end } }] },
      ],
    },
    select: {
      id: true,
      type: true,
      amount: true,
      paidAmount: true,
      paymentStatus: true,
      startDate: true,
      createdAt: true,
      customerId: true,
      customer: { select: { id: true, name: true } },
      counterpartyName: true,
    },
  });

  // 월별 분리 + 합계
  const revenue: RevenueAgg = {
    salesTotal: 0, salesPaid: 0, salesUnpaid: 0,
    outsourcingTotal: 0, outsourcingPaid: 0, outsourcingUnpaid: 0,
    netTotal: 0, netPaid: 0,
  };
  const monthlyMap: Record<number, MonthlyPoint> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyMap[m] = {
      month: m,
      salesPaid: 0, salesUnpaid: 0,
      outsourcingPaid: 0, outsourcingUnpaid: 0,
      net: 0, expense: 0,
      salesPaidCum: 0, salesUnpaidCum: 0, salesTotalCum: 0,
      outsourcingPaidCum: 0, outsourcingUnpaidCum: 0, outsourcingTotalCum: 0,
      netCum: 0, expenseCum: 0,
      cashInCum: 0, cashOutCum: 0,
      salesMinusExpenseCum: 0, netMinusExpenseCum: 0,
    };
  }

  const customerAgg = new Map<string, TopCustomer>();

  for (const c of contracts) {
    const total = Number(c.amount);
    const paid = Number(c.paidAmount);
    const unpaid = Math.max(0, total - paid);
    const effective = c.startDate ?? c.createdAt;
    const month = effective.getMonth() + 1;
    const bucket = monthlyMap[month];

    if (c.type === 'SALES') {
      revenue.salesTotal += total;
      revenue.salesPaid += paid;
      revenue.salesUnpaid += unpaid;
      bucket.salesPaid += paid;
      bucket.salesUnpaid += unpaid;

      // Top customers — 수주만 매출로 집계
      const key = c.customer?.id ?? `name:${c.counterpartyName}`;
      const existing = customerAgg.get(key);
      const name = c.customer?.name ?? c.counterpartyName;
      if (existing) {
        existing.totalAmount += total;
        existing.paidAmount += paid;
        existing.count += 1;
      } else {
        customerAgg.set(key, {
          customerId: c.customer?.id ?? null,
          name,
          totalAmount: total,
          paidAmount: paid,
          count: 1,
        });
      }
    } else {
      // OUTSOURCING
      revenue.outsourcingTotal += total;
      revenue.outsourcingPaid += paid;
      revenue.outsourcingUnpaid += unpaid;
      bucket.outsourcingPaid += paid;
      bucket.outsourcingUnpaid += unpaid;
    }
  }

  revenue.netTotal = revenue.salesTotal - revenue.outsourcingTotal;
  revenue.netPaid = revenue.salesPaid - revenue.outsourcingPaid;

  // 2) 경비 (올해) — 월별 분배도 같이 (누적 계산보다 먼저 실행)
  const expenses = await prisma.expense.findMany({
    where: { expenseDate: { gte: start, lt: end } },
    select: { amount: true, category: true, expenseDate: true },
  });
  let expenseTotal = 0;
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const amt = Number(e.amount);
    expenseTotal += amt;
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + amt;
    const month = e.expenseDate.getMonth() + 1;
    monthlyMap[month].expense += amt;
  }

  // 누적 계산 — 위에서 분배된 계약/경비를 같이 누적
  const monthly: MonthlyPoint[] = [];
  let sP = 0, sU = 0, oP = 0, oU = 0, net = 0, expCum = 0;
  for (let m = 1; m <= 12; m++) {
    const b = monthlyMap[m];
    sP += b.salesPaid;
    sU += b.salesUnpaid;
    oP += b.outsourcingPaid;
    oU += b.outsourcingUnpaid;
    net += (b.salesPaid + b.salesUnpaid) - (b.outsourcingPaid + b.outsourcingUnpaid);
    expCum += b.expense;
    b.salesPaidCum = sP;
    b.salesUnpaidCum = sU;
    b.salesTotalCum = sP + sU;
    b.outsourcingPaidCum = oP;
    b.outsourcingUnpaidCum = oU;
    b.outsourcingTotalCum = oP + oU;
    b.netCum = net;
    b.expenseCum = expCum;
    // 들어온 돈 = 수주 정산 누적
    b.cashInCum = sP;
    // 나간 돈 = 외주 정산 누적 + 경비 누적
    b.cashOutCum = oP + expCum;
    // 수주 누적 - 경비 누적
    b.salesMinusExpenseCum = (sP + sU) - expCum;
    // 순수주 누적 - 경비 누적
    b.netMinusExpenseCum = net - expCum;
    b.net = (b.salesPaid + b.salesUnpaid) - (b.outsourcingPaid + b.outsourcingUnpaid);
    monthly.push(b);
  }

  const topCustomers = [...customerAgg.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // 3) 견적 상태 (올해 발행)
  const statusRows = await prisma.quotation.groupBy({
    where: { issueDate: { gte: start, lt: end } },
    by: ['status'],
    _count: { _all: true },
  });
  const quotationStatusCounts: Record<string, number> = {
    DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0, EXPIRED: 0,
  };
  for (const r of statusRows) quotationStatusCounts[r.status] = r._count._all;

  // 4) 만료 임박 견적 (validUntil 7일 이내, SENT 상태)
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const expiringRaw = await prisma.quotation.findMany({
    where: {
      status: 'SENT',
      validUntil: { not: null, gte: now, lte: sevenDays },
    },
    orderBy: { validUntil: 'asc' },
    take: 10,
    select: {
      id: true, quotationNumber: true, title: true,
      customerName: true, validUntil: true, totalAmount: true,
    },
  });
  const expiringQuotations = expiringRaw.map((q) => ({
    id: q.id,
    quotationNumber: q.quotationNumber,
    title: q.title,
    customerName: q.customerName,
    validUntil: q.validUntil!.toISOString(),
    totalAmount: Number(q.totalAmount),
  }));

  // 5) 최근 활동 — 견적 생성/발송/계약 생성/경비 등록 최근 10건
  const [quotCreated, quotSent, contractCreated, expenseCreated] = await Promise.all([
    prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, quotationNumber: true, customerName: true, createdAt: true },
    }),
    prisma.quotationSendLog.findMany({
      where: { status: 'SUCCESS' },
      orderBy: { sentAt: 'desc' }, take: 10,
      select: {
        sentAt: true, recipient: true,
        quotation: { select: { id: true, quotationNumber: true, customerName: true } },
      },
    }),
    prisma.contract.findMany({
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, contractNumber: true, title: true, counterpartyName: true, createdAt: true },
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, description: true, amount: true, createdAt: true },
    }),
  ]);
  type Activity = DashboardResponse['recentActivity'][number];
  const activities: Activity[] = [
    ...quotCreated.map((q): Activity => ({
      type: 'QUOTATION_CREATED', at: q.createdAt.toISOString(),
      title: `견적서 ${q.quotationNumber} 생성`, subtitle: q.customerName,
      link: `/quotations/${q.id}`,
    })),
    ...quotSent.filter((s) => s.quotation).map((s): Activity => ({
      type: 'QUOTATION_SENT', at: s.sentAt.toISOString(),
      title: `견적서 ${s.quotation!.quotationNumber} 발송`,
      subtitle: `→ ${s.recipient}`,
      link: `/quotations/${s.quotation!.id}`,
    })),
    ...contractCreated.map((c): Activity => ({
      type: 'CONTRACT_CREATED', at: c.createdAt.toISOString(),
      title: `계약 ${c.contractNumber} — ${c.title}`,
      subtitle: c.counterpartyName,
      link: `/contracts/${c.id}`,
    })),
    ...expenseCreated.map((e): Activity => ({
      type: 'EXPENSE_CREATED', at: e.createdAt.toISOString(),
      title: `경비 — ${e.description}`,
      subtitle: `₩${Number(e.amount).toLocaleString('ko-KR')}`,
      link: `/expenses/${e.id}/edit`,
    })),
  ];
  activities.sort((a, b) => b.at.localeCompare(a.at));
  const recentActivity = activities.slice(0, 10);

  return {
    year,
    generatedAt: new Date().toISOString(),
    revenue,
    monthly,
    topCustomers,
    expenseTotal,
    expenseByCategory,
    quotationStatusCounts,
    expiringQuotations,
    recentActivity,
  };
}
