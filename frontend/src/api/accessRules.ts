import { api } from './client';

export interface AccessRule {
  id: string;
  cidr: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRuleInput {
  cidr: string;
  label?: string | null;
  enabled?: boolean;
}

export const accessRuleApi = {
  list: () => api.get<{ items: AccessRule[] }>('/access-rules'),
  create: (body: AccessRuleInput) => api.post<AccessRule>('/access-rules', body),
  update: (id: string, body: Partial<AccessRuleInput>) =>
    api.put<AccessRule>(`/access-rules/${id}`, body),
  remove: (id: string) => api.delete<void>(`/access-rules/${id}`),
};
