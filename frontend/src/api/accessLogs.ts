import { api } from './client';

export interface AccessLogUser {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

export interface AccessLog {
  id: string;
  userId: string | null;
  user: AccessLogUser | null;
  path: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AccessLogListParams {
  userId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const accessLogApi = {
  record: (path: string, label?: string | null) =>
    api.post<void>('/access-logs', { path, label: label ?? null }),
  list: (params: AccessLogListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.userId) sp.set('userId', params.userId);
    if (params.q) sp.set('q', params.q);
    if (params.from) sp.set('from', params.from);
    if (params.to) sp.set('to', params.to);
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return api.get<{ items: AccessLog[]; total: number; limit: number; offset: number }>(
      `/access-logs${qs ? `?${qs}` : ''}`,
    );
  },
  cleanupNow: () =>
    api.post<{ deleted: number; cutoff: string | null; retentionDays: number }>(
      '/access-logs/cleanup',
      {},
    ),
};
