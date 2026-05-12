import { z } from 'zod';
import { prisma } from './prisma';

export const quotationItemSchema = z.object({
  productId: z.string().min(1, '품목을 선택하세요'),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export const quotationSchema = z.object({
  title: z.string().max(200, '제목은 200자 이내로 입력하세요').optional().nullable(),
  customerId: z.string().min(1, '고객을 선택하세요'),
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  notes: z.string().optional().nullable(),
  vatIncluded: z.boolean().default(true),
  items: z.array(quotationItemSchema).min(1, '품목을 1개 이상 선택하세요'),
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

export interface ResolvedQuotationData {
  customerSnapshot: {
    customerId: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
  };
  itemsWithSnapshot: {
    productId: string;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
    sortOrder: number;
  }[];
  totalAmount: number;
}

export class QuotationResolveError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'QuotationResolveError';
    this.status = status;
  }
}

/**
 * 입력으로 받은 customerId / productId 를 실제 레코드로 조회해
 * 견적서에 저장될 snapshot 필드(customerName, item.name, item.unitPrice 등) 를 만든다.
 * - 비활성(isActive=false) 또는 존재하지 않는 레코드면 거부.
 * - item.description 은 사용자 입력값을 그대로 유지 (비어있으면 product.description 으로 대체).
 */
export async function resolveQuotationSnapshot(
  input: QuotationInput,
): Promise<ResolvedQuotationData> {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new QuotationResolveError('고객을 찾을 수 없습니다.');
  if (!customer.isActive) throw new QuotationResolveError('비활성화된 고객은 선택할 수 없습니다.');

  const productIds = Array.from(new Set(input.items.map((it) => it.productId)));
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const id of productIds) {
    const p = byId.get(id);
    if (!p) throw new QuotationResolveError(`품목을 찾을 수 없습니다: ${id}`);
    if (!p.isActive) throw new QuotationResolveError(`비활성화된 품목은 선택할 수 없습니다: ${p.name}`);
  }

  const itemsWithSnapshot = input.items.map((it, idx) => {
    const product = byId.get(it.productId)!;
    const unitPrice = Number(product.unitPrice);
    const description = (it.description ?? '').trim() || product.description || null;
    return {
      productId: product.id,
      name: product.name,
      description,
      quantity: it.quantity,
      unitPrice,
      amount: calcItemAmount(it.quantity, unitPrice),
      sortOrder: idx,
    };
  });

  const totalAmount = itemsWithSnapshot.reduce((s, it) => s + it.amount, 0);

  return {
    customerSnapshot: {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email ?? null,
      customerPhone: customer.phone ?? null,
      customerAddress: customer.address ?? null,
    },
    itemsWithSnapshot,
    totalAmount,
  };
}
