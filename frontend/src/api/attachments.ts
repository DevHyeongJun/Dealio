import { api } from './client';

export type AttachmentEntity = 'CONTRACT' | 'QUOTATION' | 'EXPENSE' | 'CUSTOMER' | 'USER';

export interface AttachmentUploader {
  id: string;
  name: string;
  username: string;
}

export interface Attachment {
  id: string;
  entityType: AttachmentEntity;
  entityId: string;
  filename: string;
  storedFilename: string;
  mimetype: string;
  size: number;
  uploadedById: string | null;
  uploadedBy: AttachmentUploader | null;
  createdAt: string;
}

const BASE = (import.meta as any).env?.VITE_API_BASE || '/dealio/api';

export const attachmentApi = {
  list: (entityType: AttachmentEntity, entityId: string) => {
    const sp = new URLSearchParams({ entityType, entityId });
    return api.get<{ items: Attachment[] }>(`/attachments?${sp.toString()}`);
  },
  remove: (id: string) => api.delete<void>(`/attachments/${id}`),
  upload: async (
    entityType: AttachmentEntity,
    entityId: string,
    file: File,
  ): Promise<Attachment> => {
    const fd = new FormData();
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    fd.append('file', file);
    const res = await fetch(`${BASE}/attachments`, {
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
    return res.json();
  },
  downloadUrl: (id: string) => `${BASE}/attachments/${id}/download`,
};
