import { api } from './client';

export interface MailSubjectPlaceholder {
  key: string;
  description: string;
  sample: string;
}

export interface CompanyProfile {
  name: string;
  businessNumber: string;
  representative: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
}

export const COMPANY_FIELD_ORDER: (keyof CompanyProfile)[] = [
  'name',
  'representative',
  'businessNumber',
  'address',
  'phone',
  'fax',
  'email',
  'contactPerson',
  'contactPhone',
];

export interface QuotationPdfTheme {
  headerTitle: string;
  accentColor: string;
  footerNote: string;
  showStamp: boolean;
}

export const QUOTATION_PDF_FIELD_ORDER: (keyof QuotationPdfTheme)[] = [
  'headerTitle',
  'accentColor',
  'footerNote',
  'showStamp',
];

export interface BusinessRegistrationMeta {
  filename: string;
  mimetype: string;
  size: number;
}

export interface AppSettings {
  mailSubjectTemplate: string;
  mailSubjectPreview: string;
  mailBodyHtmlTemplate: string;
  mailBodyHtmlPreview: string;
  company: CompanyProfile;
  companyFieldLabels: Record<keyof CompanyProfile, string>;
  businessRegistration: BusinessRegistrationMeta | null;
  quotationPdf: QuotationPdfTheme;
  quotationPdfFieldLabels: Record<keyof QuotationPdfTheme, string>;
  quotationPdfTemplate: string;
  /** 접속 로그 보존 일수 (0 = 자동 삭제 비활성) */
  accessLogRetentionDays: number;
  /** IP 화이트리스트 활성 여부 */
  ipFilterEnabled: boolean;
  defaults: {
    mailSubjectTemplate: string;
    mailBodyHtmlTemplate: string;
    quotationPdf: QuotationPdfTheme;
    quotationPdfTemplate: string;
  };
  placeholders: MailSubjectPlaceholder[];
  htmlBodyPlaceholders: MailSubjectPlaceholder[];
}

export interface AppSettingsInput {
  mailSubjectTemplate?: string;
  mailBodyHtmlTemplate?: string;
  company?: Partial<CompanyProfile>;
  quotationPdf?: Partial<QuotationPdfTheme>;
  /** null 또는 빈 문자열로 보내면 기본 템플릿으로 리셋 */
  quotationPdfTemplate?: string | null;
  /** 0 또는 null → 자동 삭제 비활성 */
  accessLogRetentionDays?: number | null;
  /** IP 화이트리스트 활성 토글 */
  ipFilterEnabled?: boolean;
}

const BASE = (import.meta as any).env?.VITE_API_BASE || '/dealio/api';

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings'),
  update: (body: AppSettingsInput) => api.put<AppSettings>('/settings', body),
  /** PDF 미리보기 — 템플릿 미지정 시 저장된(또는 기본) 템플릿 사용. PDF Buffer 를 새 탭으로 띄울 수 있는 blob URL 을 반환. */
  pdfPreview: async (template?: string | null): Promise<string> => {
    const res = await fetch(`${BASE}/settings/pdf-preview`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: template ?? null }),
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
    return URL.createObjectURL(blob);
  },
  uploadBusinessRegistration: async (file: File): Promise<BusinessRegistrationMeta> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/settings/business-registration`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error || parsed?.message || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
    return res.json();
  },
  deleteBusinessRegistration: () =>
    api.delete<void>('/settings/business-registration'),
  businessRegistrationUrl: () => `${BASE}/settings/business-registration`,
};
