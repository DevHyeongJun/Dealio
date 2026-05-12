import { api } from './client';
import type { AuthUser, UserRole } from './auth';

export interface CompanyBrief {
  id: string;
  name: string;
  isActive: boolean;
}

export interface User extends AuthUser {
  companyId?: string | null;
  company?: CompanyBrief | null;
  jobTitle?: string | null;
  phone?: string | null;
  businessCardPath?: string | null;
  businessCardName?: string | null;
}

export interface UserCreateInput {
  username: string;
  email?: string | null;
  name: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  companyId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
}

export interface UserUpdateInput {
  username?: string;
  email?: string | null;
  name?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  companyId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
}

export interface UserListParams {
  /** companyId 또는 'none' (회사 미배정만) */
  companyId?: string | 'none';
  q?: string;
}

const BASE = (import.meta as any).env?.VITE_API_BASE || '/dealio/api';

export const userApi = {
  list: (params: UserListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.companyId) sp.set('companyId', params.companyId);
    if (params.q) sp.set('q', params.q);
    const qs = sp.toString();
    return api.get<{ items: User[] }>(`/users${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (body: UserCreateInput) => api.post<User>('/users', body),
  update: (id: string, body: UserUpdateInput) => api.put<User>(`/users/${id}`, body),
  remove: (id: string) => api.delete<void>(`/users/${id}`),

  /** 명함 이미지 업로드 (multipart) */
  uploadBusinessCard: async (id: string, file: File): Promise<void> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/users/${id}/business-card`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        message = j?.message || j?.error || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
  },

  deleteBusinessCard: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE}/users/${id}/business-card`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`HTTP ${res.status}`);
    }
  },

  /** 명함 이미지 URL — businessCardPath 가 있을 때 cache-buster 와 함께 반환 */
  businessCardUrl: (id: string, cacheBust?: string | number) =>
    `${BASE}/users/${id}/business-card${cacheBust ? `?v=${cacheBust}` : ''}`,
};
