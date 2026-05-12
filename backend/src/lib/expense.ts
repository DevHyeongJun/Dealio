import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'MEAL',
  'TRANSPORT',
  'MATERIAL',
  'OUTSOURCING',
  'ENTERTAINMENT',
  'COMMUNICATION',
  'OFFICE',
  'OTHER',
] as const;

export const PAYMENT_METHODS = ['CARD', 'CASH', 'TRANSFER', 'OTHER'] as const;

export type ExpenseCategoryT = (typeof EXPENSE_CATEGORIES)[number];
export type PaymentMethodT = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryT, string> = {
  MEAL: '식비',
  TRANSPORT: '교통비',
  MATERIAL: '자재비',
  OUTSOURCING: '외주비',
  ENTERTAINMENT: '접대비',
  COMMUNICATION: '통신비',
  OFFICE: '사무용품',
  OTHER: '기타',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodT, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  OTHER: '기타',
};

export const expenseSchema = z.object({
  expenseDate: z.coerce.date(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, '내용을 입력하세요').max(500, '500자 이내로 입력하세요'),
  amount: z.coerce.number().min(0, '금액은 0 이상이어야 합니다'),
  paymentMethod: z.enum(PAYMENT_METHODS).default('CARD'),
  vendor: z.string().max(200).optional().nullable().or(z.literal('').transform(() => null)),
  notes: z.string().max(2000).optional().nullable().or(z.literal('').transform(() => null)),
  contractId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
