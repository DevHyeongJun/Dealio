import { api } from './client';
import type { UserBrief } from './quotations';

export type ContractType = 'OUTSOURCING' | 'SALES';
export type ContractPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface ContractQuotationBrief {
  id: string;
  quotationNumber: string;
  title: string | null;
  customerName: string;
  totalAmount: number | string;
  status: string;
}

export interface ContractCustomerBrief {
  id: string;
  name: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  counterpartyName: string;
  customer?: ContractCustomerBrief | null;
  customerId?: string | null;
  quotation?: ContractQuotationBrief | null;
  quotationId?: string | null;
  amount: number | string;
  vatIncluded: boolean;
  paidAmount: number | string;
  paymentStatus: ContractPaymentStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdBy?: UserBrief | null;
  updatedBy?: UserBrief | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractInput {
  title: string;
  type: ContractType;
  customerId: string;
  quotationId?: string | null;
  amount: number;
  vatIncluded: boolean;
  paidAmount: number;
  paymentStatus: ContractPaymentStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export type ContractActionType = 'CREATE' | 'UPDATE' | 'PAYMENT_STATUS_CHANGE' | 'DELETE';

export interface ContractHistoryEntry {
  id: string;
  contractId: string;
  userId: string | null;
  user: UserBrief | null;
  action: ContractActionType;
  summary: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ContractTypeBucket {
  contractAmount: number;
  paidAmount: number;
  count: number;
  paid: number;
  partial: number;
  unpaid: number;
  outstanding: number;
}

export interface ContractSummary {
  total: { contractAmount: number; paidAmount: number; count: number };
  sales: ContractTypeBucket;
  outsourcing: ContractTypeBucket;
}

export const contractApi = {
  list: (params: { q?: string; type?: ContractType; paymentStatus?: ContractPaymentStatus; take?: number; skip?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.type) sp.set('type', params.type);
    if (params.paymentStatus) sp.set('paymentStatus', params.paymentStatus);
    if (params.take !== undefined) sp.set('take', String(params.take));
    if (params.skip !== undefined) sp.set('skip', String(params.skip));
    const qs = sp.toString();
    return api.get<{ items: Contract[]; total: number }>(`/contracts${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Contract>(`/contracts/${id}`),
  create: (body: ContractInput) => api.post<Contract>('/contracts', body),
  update: (id: string, body: ContractInput) => api.put<Contract>(`/contracts/${id}`, body),
  remove: (id: string) => api.delete<void>(`/contracts/${id}`),
  history: (id: string) => api.get<{ items: ContractHistoryEntry[] }>(`/contracts/${id}/history`),
  summary: () => api.get<ContractSummary>('/contracts/summary'),
};

export const CONTRACT_HISTORY_LABELS: Record<ContractActionType, string> = {
  CREATE: '생성',
  UPDATE: '수정',
  PAYMENT_STATUS_CHANGE: '정산 상태 변경',
  DELETE: '삭제',
};

export const CONTRACT_HISTORY_COLORS: Record<ContractActionType, string> = {
  CREATE: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PAYMENT_STATUS_CHANGE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  OUTSOURCING: '외주',
  SALES: '수주',
};

// 배경 없이 글씨 색만으로 유형 구분 (사용자 요청)
export const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
  OUTSOURCING: 'text-amber-700 dark:text-amber-400',
  SALES: 'text-brand-600 dark:text-brand-400',
};

export const PAYMENT_STATUS_LABELS: Record<ContractPaymentStatus, string> = {
  UNPAID: '미정산',
  PARTIAL: '부분 정산',
  PAID: '정산 완료',
};

export const PAYMENT_STATUS_COLORS: Record<ContractPaymentStatus, string> = {
  UNPAID: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};
