import { api } from './client';

export interface Company {
  id: string;
  name: string;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export interface CompanyInput {
  name: string;
  memo?: string | null;
  isActive: boolean;
}

export const companyApi = {
  list: (params: { q?: string; activeOnly?: boolean } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.activeOnly) sp.set('activeOnly', 'true');
    const qs = sp.toString();
    return api.get<{ items: Company[]; total: number }>(`/companies${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  create: (body: CompanyInput) => api.post<Company>('/companies', body),
  update: (id: string, body: CompanyInput) => api.put<Company>(`/companies/${id}`, body),
  remove: (id: string) => api.delete<void>(`/companies/${id}`),
};
