import { api } from './client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuotationItem {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number | string;
  amount?: number | string;
  sortOrder?: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  issueDate: string;
  validUntil?: string | null;
  status: QuotationStatus;
  notes?: string | null;
  totalAmount: number | string;
  items?: QuotationItem[];
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export interface QuotationInput {
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  issueDate?: string;
  validUntil?: string | null;
  status: QuotationStatus;
  notes?: string | null;
  items: QuotationItem[];
}

export const quotationApi = {
  list: (params: { q?: string; status?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.status) sp.set('status', params.status);
    const qs = sp.toString();
    return api.get<{ items: Quotation[]; total: number }>(`/quotations${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (body: QuotationInput) => api.post<Quotation>('/quotations', body),
  update: (id: string, body: QuotationInput) => api.put<Quotation>(`/quotations/${id}`, body),
  remove: (id: string) => api.delete<void>(`/quotations/${id}`),
};

export const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: '작성중',
  SENT: '발송됨',
  ACCEPTED: '승인',
  REJECTED: '반려',
  EXPIRED: '만료',
};

export const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
};
