import { api } from './client';

export type ProductCategory = 'DEVELOPMENT' | 'DESIGN' | 'MAINTENANCE' | 'PRINTING';
export type Currency = 'KRW' | 'USD';

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: ProductCategory;
  unit: string;
  currency: Currency;
  unitPrice: number | string;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  code?: string; // 신규 시 비워두면 서버에서 자동 생성 (P-000001), 수정 시 무시됨
  name: string;
  description?: string | null;
  category: ProductCategory;
  unit: string;
  currency: Currency;
  unitPrice: number;
  isActive: boolean;
}

export const productApi = {
  list: (params: { q?: string; activeOnly?: boolean; category?: ProductCategory; take?: number; skip?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.activeOnly) sp.set('activeOnly', 'true');
    if (params.category) sp.set('category', params.category);
    if (params.take !== undefined) sp.set('take', String(params.take));
    if (params.skip !== undefined) sp.set('skip', String(params.skip));
    const qs = sp.toString();
    return api.get<{ items: Product[]; total: number }>(`/products${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (body: ProductInput) => api.post<Product>('/products', body),
  update: (id: string, body: ProductInput) => api.put<Product>(`/products/${id}`, body),
  remove: (id: string) => api.delete<void>(`/products/${id}`),
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  DEVELOPMENT: '개발',
  DESIGN: '디자인',
  MAINTENANCE: '유지보수',
  PRINTING: '인쇄',
};

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  DEVELOPMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DESIGN: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  MAINTENANCE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PRINTING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  KRW: '원 (KRW)',
  USD: '달러 (USD)',
};
