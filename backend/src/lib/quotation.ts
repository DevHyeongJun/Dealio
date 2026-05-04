import { z } from 'zod';

export const quotationItemSchema = z.object({
  name: z.string().min(1, '품목명은 필수입니다'),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

export const quotationSchema = z.object({
  customerName: z.string().min(1, '고객명은 필수입니다'),
  customerEmail: z.string().email().optional().nullable().or(z.literal('').transform(() => null)),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).default([]),
});

export type QuotationInput = z.infer<typeof quotationSchema>;

export function generateQuotationNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `Q-${yyyy}${mm}${dd}-${rand}`;
}

export function calcItemAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}
