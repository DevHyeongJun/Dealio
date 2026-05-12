import { z } from 'zod';

export const contractSchema = z.object({
  title: z.string().min(1, '계약명은 필수입니다'),
  type: z.enum(['OUTSOURCING', 'SALES']),
  customerId: z.string().min(1, '거래처(고객)를 선택하세요'),
  quotationId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  amount: z.coerce.number().min(0, '금액은 0 이상이어야 합니다').default(0),
  vatIncluded: z.boolean().default(true),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentStatus: z.enum(['UNPAID', 'PARTIAL', 'PAID']).default('UNPAID'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ContractInput = z.infer<typeof contractSchema>;

export function generateContractNumber(type: 'OUTSOURCING' | 'SALES'): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const prefix = type === 'SALES' ? 'CS' : 'CO'; // Contract-Sales / Contract-Outsourcing
  return `${prefix}-${yyyy}${mm}${dd}-${rand}`;
}
