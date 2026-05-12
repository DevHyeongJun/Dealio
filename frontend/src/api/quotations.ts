import { api } from './client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface UserBrief {
  id: string;
  name: string;
  email: string;
}

export type QuotationActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'STATUS_CHANGE'
  | 'SEND'
  | 'DELETE';

export interface QuotationHistoryEntry {
  id: string;
  quotationId: string;
  userId: string | null;
  user: UserBrief | null;
  action: QuotationActionType;
  summary: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface QuotationItem {
  id?: string;
  productId?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number | string;
  amount?: number | string;
  sortOrder?: number;
}

export interface QuotationItemInput {
  productId: string;
  description?: string | null;
  quantity: number;
}

export type SendStatus = 'PENDING' | 'SUCCESS' | 'FAIL';

export interface QuotationSendLog {
  id: string;
  quotationId: string;
  recipient: string;
  cc?: string | null;
  subject: string;
  body: string;
  status: SendStatus;
  error?: string | null;
  messageId?: string | null;
  sentAt: string;
  user?: UserBrief | null;
}

export interface SendQuotationInput {
  to: string;
  cc?: string | null;
  subject?: string | null;
  body?: string | null;
  markAsSent?: boolean;
  attachPdf?: boolean;
  attachBusinessRegistration?: boolean;
  attachBusinessCard?: boolean;
  /** 명함 첨부 시 어느 사용자의 명함인지. 미지정 = 발송자 본인 */
  businessCardUserId?: string | null;
  /** 이 견적서에 등록된 첨부파일 중 함께 보낼 ID 목록 */
  attachmentIds?: string[];
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  title?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string; isActive: boolean } | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  issueDate: string;
  validUntil?: string | null;
  status: QuotationStatus;
  notes?: string | null;
  totalAmount: number | string;
  vatIncluded: boolean;
  items?: QuotationItem[];
  sendLogs?: QuotationSendLog[];
  createdBy?: UserBrief | null;
  updatedBy?: UserBrief | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export interface QuotationInput {
  title?: string | null;
  customerId: string;
  issueDate?: string;
  validUntil?: string | null;
  status: QuotationStatus;
  notes?: string | null;
  vatIncluded: boolean;
  items: QuotationItemInput[];
}

export const VAT_RATE = 0.1;

export interface VatBreakdown {
  supply: number;
  vat: number;
  total: number;
}

export function calcVatBreakdown(itemsSum: number, vatIncluded: boolean): VatBreakdown {
  const sum = Number(itemsSum) || 0;
  if (vatIncluded) {
    const supply = Math.round((sum / (1 + VAT_RATE)) * 100) / 100;
    return { supply, vat: Math.round((sum - supply) * 100) / 100, total: sum };
  }
  return {
    supply: sum,
    vat: Math.round(sum * VAT_RATE * 100) / 100,
    total: Math.round(sum * (1 + VAT_RATE) * 100) / 100,
  };
}

export const quotationApi = {
  list: (params: { q?: string; status?: string; take?: number; skip?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.status) sp.set('status', params.status);
    if (params.take !== undefined) sp.set('take', String(params.take));
    if (params.skip !== undefined) sp.set('skip', String(params.skip));
    const qs = sp.toString();
    return api.get<{ items: Quotation[]; total: number }>(`/quotations${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (body: QuotationInput) => api.post<Quotation>('/quotations', body),
  update: (id: string, body: QuotationInput) => api.put<Quotation>(`/quotations/${id}`, body),
  remove: (id: string) => api.delete<void>(`/quotations/${id}`),
  send: (id: string, body: SendQuotationInput) =>
    api.post<{ ok: boolean; log: QuotationSendLog; error?: string }>(
      `/quotations/${id}/send`,
      body
    ),
  history: (id: string) =>
    api.get<{ items: QuotationHistoryEntry[] }>(`/quotations/${id}/history`),
  mailPreview: (id: string) =>
    api.get<{ subject: string; html: string }>(`/quotations/${id}/mail-preview`),
  downloadPdf: async (id: string): Promise<void> => {
    const base = (import.meta as any).env?.VITE_API_BASE || '/dealio/api';
    const res = await fetch(`${base}/quotations/${id}/pdf`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.error || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const filename = parseFilename(cd) || `quotation-${id}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

function parseFilename(contentDisposition: string): string | null {
  // RFC 5987: filename*=UTF-8''<percent-encoded>
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1].trim() : null;
}

export const HISTORY_ACTION_LABELS: Record<QuotationActionType, string> = {
  CREATE: '생성',
  UPDATE: '수정',
  STATUS_CHANGE: '상태변경',
  SEND: '발송',
  DELETE: '삭제',
};

export const HISTORY_ACTION_COLORS: Record<QuotationActionType, string> = {
  CREATE: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  STATUS_CHANGE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  SEND: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const SEND_STATUS_LABELS: Record<SendStatus, string> = {
  PENDING: '대기',
  SUCCESS: '성공',
  FAIL: '실패',
};

export const SEND_STATUS_COLORS: Record<SendStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SUCCESS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
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
