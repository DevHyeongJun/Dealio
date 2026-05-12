import { api } from './client';

export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  companyId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  businessCardPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  me: () => api.get<{ user: AuthUser | null }>('/auth/me'),
  login: (username: string, password: string) =>
    api.post<{ user: AuthUser }>('/auth/login', { username, password }),
  logout: () => api.post<{ ok: true }>('/auth/logout', {}),
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '관리자',
  USER: '일반',
};
