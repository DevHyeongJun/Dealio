import { api } from './client';

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessNumber?: string | null;
  representative?: string | null;
  businessAddress?: string | null;
  businessSector?: string | null;
  businessItem?: string | null;
  memo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  businessNumber?: string | null;
  representative?: string | null;
  businessAddress?: string | null;
  businessSector?: string | null;
  businessItem?: string | null;
  memo?: string | null;
  isActive: boolean;
}

export const customerApi = {
  list: (params: { q?: string; activeOnly?: boolean; take?: number; skip?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.activeOnly) sp.set('activeOnly', 'true');
    if (params.take !== undefined) sp.set('take', String(params.take));
    if (params.skip !== undefined) sp.set('skip', String(params.skip));
    const qs = sp.toString();
    return api.get<{ items: Customer[]; total: number }>(`/customers${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (body: CustomerInput) => api.post<Customer>('/customers', body),
  update: (id: string, body: CustomerInput) => api.put<Customer>(`/customers/${id}`, body),
  remove: (id: string) => api.delete<void>(`/customers/${id}`),
};
