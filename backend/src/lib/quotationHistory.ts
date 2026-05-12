import type { Prisma, PrismaClient, QuotationAction } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

export interface RecordHistoryInput {
  quotationId: string;
  userId?: string | null;
  action: QuotationAction;
  summary: string;
  details?: Prisma.InputJsonValue;
}

export async function recordHistory(tx: Tx, input: RecordHistoryInput) {
  await tx.quotationHistory.create({
    data: {
      quotationId: input.quotationId,
      userId: input.userId ?? null,
      action: input.action,
      summary: input.summary,
      details: input.details ?? undefined,
    },
  });
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '작성중',
  SENT: '발송됨',
  ACCEPTED: '승인',
  REJECTED: '반려',
  EXPIRED: '만료',
};

export function statusChangeSummary(from: string, to: string): string {
  return `상태 변경: ${STATUS_LABELS[from] ?? from} → ${STATUS_LABELS[to] ?? to}`;
}
