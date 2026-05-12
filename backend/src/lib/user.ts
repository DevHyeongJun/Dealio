import { z } from 'zod';

const usernameSchema = z
  .string()
  .min(3, '아이디는 최소 3자 이상이어야 합니다')
  .max(40, '아이디는 최대 40자입니다')
  .regex(/^[a-zA-Z0-9._-]+$/, '아이디는 영문/숫자/._- 만 사용할 수 있습니다');

const emailSchema = z
  .string()
  .email('올바른 이메일을 입력하세요')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

const optionalString = z
  .string()
  .max(200, '200자 이내로 입력하세요')
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

const optionalCompanyId = z
  .string()
  .optional()
  .nullable()
  .or(z.literal('').transform(() => null));

export const userCreateSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  name: z.string().min(1, '이름은 필수입니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  isActive: z.boolean().default(true),
  companyId: optionalCompanyId,
  jobTitle: optionalString,
  phone: optionalString,
});

export const userUpdateSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema,
  name: z.string().min(1).optional(),
  password: z
    .string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: z.enum(['ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
  companyId: optionalCompanyId,
  jobTitle: optionalString,
  phone: optionalString,
});

export const companySchema = z.object({
  name: z.string().min(1, '회사명은 필수입니다').max(200),
  memo: optionalString,
  isActive: z.boolean().default(true),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
