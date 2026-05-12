import { z } from 'zod';

const optionalString = (max = 200) =>
  z.string().max(max, `${max}자 이내로 입력하세요`).optional().nullable().or(z.literal('').transform(() => null));

export const customerSchema = z.object({
  name: z.string().min(1, '고객명은 필수입니다'),
  email: z.string().email('이메일 형식이 올바르지 않습니다').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  businessNumber: optionalString(20),
  representative: optionalString(100),
  businessAddress: optionalString(500),
  businessSector: optionalString(100),
  businessItem: optionalString(200),
  memo: z.string().optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
