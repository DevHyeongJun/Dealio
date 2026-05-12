import type { Prisma, PrismaClient, ContractAction, Contract } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

export interface RecordContractHistoryInput {
  contractId: string;
  userId?: string | null;
  action: ContractAction;
  summary: string;
  details?: Prisma.InputJsonValue;
}

export async function recordContractHistory(tx: Tx, input: RecordContractHistoryInput) {
  await tx.contractHistory.create({
    data: {
      contractId: input.contractId,
      userId: input.userId ?? null,
      action: input.action,
      summary: input.summary,
      details: input.details ?? undefined,
    },
  });
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: '미정산',
  PARTIAL: '부분 정산',
  PAID: '정산 완료',
};

export function paymentStatusChangeSummary(from: string, to: string): string {
  return `정산 상태 변경: ${PAYMENT_STATUS_LABELS[from] ?? from} → ${PAYMENT_STATUS_LABELS[to] ?? to}`;
}

const FIELD_LABELS: Record<string, string> = {
  title: '계약명',
  type: '계약 유형',
  customerId: '거래처',
  quotationId: '연결 견적서',
  amount: '계약금액',
  paidAmount: '정산금액',
  paymentStatus: '정산 상태',
  startDate: '시작일',
  endDate: '종료일',
  notes: '비고',
};

const DATE_FIELDS = new Set(['startDate', 'endDate']);
const NUMBER_FIELDS = new Set(['amount', 'paidAmount']);

type JsonPrimitive = string | number | boolean | null;

function normalize(value: unknown): JsonPrimitive {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  // Decimal 등은 toString 으로
  return String(value);
}

export type ContractDiffDetails = Record<string, { from: JsonPrimitive; to: JsonPrimitive }>;

export function diffContract(prev: Contract, next: Contract): { changed: string[]; details: ContractDiffDetails } {
  const fields = Object.keys(FIELD_LABELS);
  const changed: string[] = [];
  const details: ContractDiffDetails = {};
  for (const f of fields) {
    const a = normalize((prev as any)[f]);
    const b = normalize((next as any)[f]);
    let equal = false;
    if (NUMBER_FIELDS.has(f)) {
      equal = Number(a ?? 0) === Number(b ?? 0);
    } else if (DATE_FIELDS.has(f)) {
      equal = String(a ?? '') === String(b ?? '');
    } else {
      equal = (a ?? null) === (b ?? null);
    }
    if (!equal) {
      changed.push(FIELD_LABELS[f] ?? f);
      details[f] = { from: a, to: b };
    }
  }
  return { changed, details };
}
