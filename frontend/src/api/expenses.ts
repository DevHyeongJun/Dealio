import { api } from './client';

export type ExpenseCategory =
  | 'MEAL'
  | 'TRANSPORT'
  | 'MATERIAL'
  | 'OUTSOURCING'
  | 'ENTERTAINMENT'
  | 'COMMUNICATION'
  | 'OFFICE'
  | 'OTHER';

export type PaymentMethod = 'CARD' | 'CASH' | 'TRANSFER' | 'OTHER';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'MEAL',
  'TRANSPORT',
  'MATERIAL',
  'OUTSOURCING',
  'ENTERTAINMENT',
  'COMMUNICATION',
  'OFFICE',
  'OTHER',
];

export const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'CASH', 'TRANSFER', 'OTHER'];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MEAL: '식비',
  TRANSPORT: '교통비',
  MATERIAL: '자재비',
  OUTSOURCING: '외주비',
  ENTERTAINMENT: '접대비',
  COMMUNICATION: '통신비',
  OFFICE: '사무용품',
  OTHER: '기타',
};

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  MEAL:          'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  TRANSPORT:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  MATERIAL:      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  OUTSOURCING:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ENTERTAINMENT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  COMMUNICATION: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  OFFICE:        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  OTHER:         'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  OTHER: '기타',
};

export interface UserBrief {
  id: string;
  name: string;
  email: string | null;
}

export interface ContractBrief {
  id: string;
  contractNumber: string;
  title: string;
}

export interface Expense {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number | string;
  paymentMethod: PaymentMethod;
  vendor: string | null;
  notes: string | null;
  contractId: string | null;
  contract: ContractBrief | null;
  createdById: string | null;
  createdBy: UserBrief | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  vendor?: string | null;
  notes?: string | null;
  contractId?: string | null;
}

export interface ExpenseListResponse {
  items: Expense[];
  total: number;
  totalAmount: number;
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export interface ExpenseListParams {
  q?: string;
  category?: ExpenseCategory;
  /** 'none' = 계약 미연결만, 그 외 contractId */
  contractId?: string | 'none';
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

export const expenseApi = {
  list: (params: ExpenseListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category) sp.set('category', params.category);
    if (params.contractId) sp.set('contractId', params.contractId);
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    if (params.take !== undefined) sp.set('take', String(params.take));
    if (params.skip !== undefined) sp.set('skip', String(params.skip));
    const qs = sp.toString();
    return api.get<ExpenseListResponse>(`/expenses${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (body: ExpenseInput) => api.post<Expense>('/expenses', body),
  update: (id: string, body: ExpenseInput) => api.put<Expense>(`/expenses/${id}`, body),
  remove: (id: string) => api.delete<void>(`/expenses/${id}`),
};
