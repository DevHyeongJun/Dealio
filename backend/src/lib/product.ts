import { z } from 'zod';
import { prisma } from './prisma';

export const productCategorySchema = z.enum(['DEVELOPMENT', 'DESIGN', 'MAINTENANCE', 'PRINTING']);
export const currencySchema = z.enum(['KRW', 'USD']);

// 신규 생성 시 code 는 비어있어도 됨 (서버에서 자동 생성). 수정 시 PUT 라우트에서 별도 처리.
export const productSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1, '품목명은 필수입니다'),
  description: z.string().optional().nullable(),
  category: productCategorySchema.default('DEVELOPMENT'),
  unit: z.string().default('EA'),
  currency: currencySchema.default('KRW'),
  unitPrice: z.coerce.number().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

const CODE_PREFIX = 'P-';
const CODE_PADDING = 6;

/**
 * P-000001 형식의 다음 코드 반환. 동시 생성 충돌 가능성이 있어 호출자가 재시도해야 함.
 */
export async function generateProductCode(): Promise<string> {
  const last = await prisma.product.findFirst({
    where: { code: { startsWith: CODE_PREFIX } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  let next = 1;
  if (last) {
    const m = new RegExp(`^${CODE_PREFIX}(\\d+)$`).exec(last.code);
    if (m) next = Number(m[1]) + 1;
  }
  return `${CODE_PREFIX}${String(next).padStart(CODE_PADDING, '0')}`;
}
