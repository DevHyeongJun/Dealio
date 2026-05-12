import { prisma } from './prisma';

export const APP_SETTING_KEYS = {
  mailSubjectTemplate: 'mail.subject.template',
  mailBodyHtmlTemplate: 'mail.body.html.template',
  companyName: 'company.name',
  companyBusinessNumber: 'company.businessNumber',
  companyRepresentative: 'company.representative',
  companyAddress: 'company.address',
  companyPhone: 'company.phone',
  companyFax: 'company.fax',
  companyEmail: 'company.email',
  companyContactPerson: 'company.contactPerson',
  companyContactPhone: 'company.contactPhone',
  companyBusinessRegistration: 'company.businessRegistration',
  pdfQuotationHeaderTitle: 'pdf.quotation.headerTitle',
  pdfQuotationAccentColor: 'pdf.quotation.accentColor',
  pdfQuotationFooterNote: 'pdf.quotation.footerNote',
  pdfQuotationShowStamp: 'pdf.quotation.showStamp',
  pdfQuotationTemplate: 'pdf.quotation.template',
  accessLogRetentionDays: 'accessLog.retentionDays',
  ipFilterEnabled: 'accessControl.ipFilterEnabled',
} as const;

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

export interface QuotationPdfTheme {
  headerTitle: string;
  accentColor: string; // hex 색 (예: #2563EB)
  footerNote: string;
  showStamp: boolean;
}

export const DEFAULT_QUOTATION_PDF_THEME: QuotationPdfTheme = {
  headerTitle: '견 적 서',
  accentColor: '#2563EB',
  footerNote: '',
  showStamp: false,
};

export const QUOTATION_PDF_FIELD_LABELS: Record<keyof QuotationPdfTheme, string> = {
  headerTitle: '헤더 타이틀',
  accentColor: '강조색',
  footerNote: '푸터 안내 문구',
  showStamp: '도장/서명 자리 표시',
};

export const COMPANY_FIELD_LABELS: Record<keyof CompanyProfile, string> = {
  name: '상호',
  businessNumber: '사업자등록번호',
  representative: '대표자',
  address: '소재지',
  phone: '전화',
  fax: '팩스',
  email: '이메일',
  contactPerson: '담당자',
  contactPhone: '담당자 연락처',
};

export const DEFAULT_MAIL_SUBJECT_TEMPLATE = '[견적서] {quotationNumber} — {customerName}';

export const MAIL_SUBJECT_PLACEHOLDERS: { key: string; description: string; sample: string }[] = [
  { key: 'quotationNumber', description: '견적번호', sample: 'Q-2026-0042' },
  { key: 'customerName', description: '고객명', sample: '유안 주식회사' },
  { key: 'customerEmail', description: '고객 이메일', sample: 'contact@yooan.co.kr' },
  { key: 'totalAmount', description: '합계금액 (₩ 포맷)', sample: '₩1,200,000' },
  { key: 'issueDate', description: '발행일', sample: '2026.05.04.' },
  { key: 'validUntil', description: '유효기한', sample: '2026.06.03.' },
];

export const DEFAULT_MAIL_BODY_HTML_TEMPLATE = `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;">
        <tr><td style="padding:28px 32px 12px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#6b7280;letter-spacing:0.04em;">QUOTATION</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#111827;">견적서 {quotationNumber}</h1>
          <p style="margin:8px 0 0;color:#4b5563;font-size:14px;">{customerName} 담당자님께 견적서를 송부드립니다.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <table width="100%" style="font-size:13px;color:#4b5563;">
            <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;width:80px;">발행일</td><td style="color:#111827;">{issueDate}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">유효기한</td><td style="color:#111827;">{validUntil}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#9ca3af;">합계금액</td><td style="color:#111827;font-weight:600;">{totalAmount}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 12px;">
          {itemsTable}
        </td></tr>
        {notesHtmlBlock}
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
          감사합니다.
        </td></tr>
      </table>
      <div style="max-width:640px;margin-top:16px;color:#9ca3af;font-size:11px;text-align:center;">
        본 메일은 견적서 안내 목적으로 발송되었습니다.
      </div>
    </td></tr>
  </table>
</body>
</html>`;

export const MAIL_BODY_HTML_PLACEHOLDERS: { key: string; description: string; sample: string }[] = [
  ...MAIL_SUBJECT_PLACEHOLDERS,
  {
    key: 'itemsTable',
    description: '품목 표 (HTML 자동 생성)',
    sample:
      '<table style="border-collapse:collapse;width:100%;font-size:13px;"><thead><tr style="background:#f9fafb;"><th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">품목</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">수량</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">단가</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">금액</th></tr></thead><tbody><tr><td style="padding:8px;border:1px solid #e5e7eb;">샘플 품목</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">1</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₩1,000,000</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">₩1,000,000</td></tr></tbody></table>',
  },
  {
    key: 'notesHtmlBlock',
    description: '비고 HTML 블록 (없으면 빈 문자열)',
    sample:
      '<tr><td style="padding:0 32px 24px;color:#374151;font-size:13px;white-space:pre-wrap;">협의 후 일정 조정 가능</td></tr>',
  },
];

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.appSetting.delete({ where: { key } }).catch(() => undefined);
}

export async function getMailSubjectTemplate(): Promise<string> {
  const v = await getSetting(APP_SETTING_KEYS.mailSubjectTemplate);
  return (v && v.trim()) || DEFAULT_MAIL_SUBJECT_TEMPLATE;
}

export async function getMailBodyHtmlTemplate(): Promise<string> {
  const v = await getSetting(APP_SETTING_KEYS.mailBodyHtmlTemplate);
  return (v && v.length > 0) ? v : DEFAULT_MAIL_BODY_HTML_TEMPLATE;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          APP_SETTING_KEYS.companyName,
          APP_SETTING_KEYS.companyBusinessNumber,
          APP_SETTING_KEYS.companyRepresentative,
          APP_SETTING_KEYS.companyAddress,
          APP_SETTING_KEYS.companyPhone,
          APP_SETTING_KEYS.companyFax,
          APP_SETTING_KEYS.companyEmail,
          APP_SETTING_KEYS.companyContactPerson,
          APP_SETTING_KEYS.companyContactPhone,
        ],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    name: map.get(APP_SETTING_KEYS.companyName) ?? '',
    businessNumber: map.get(APP_SETTING_KEYS.companyBusinessNumber) ?? '',
    representative: map.get(APP_SETTING_KEYS.companyRepresentative) ?? '',
    address: map.get(APP_SETTING_KEYS.companyAddress) ?? '',
    phone: map.get(APP_SETTING_KEYS.companyPhone) ?? '',
    fax: map.get(APP_SETTING_KEYS.companyFax) ?? '',
    email: map.get(APP_SETTING_KEYS.companyEmail) ?? '',
    contactPerson: map.get(APP_SETTING_KEYS.companyContactPerson) ?? '',
    contactPhone: map.get(APP_SETTING_KEYS.companyContactPhone) ?? '',
  };
}

export async function getQuotationPdfTheme(): Promise<QuotationPdfTheme> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          APP_SETTING_KEYS.pdfQuotationHeaderTitle,
          APP_SETTING_KEYS.pdfQuotationAccentColor,
          APP_SETTING_KEYS.pdfQuotationFooterNote,
          APP_SETTING_KEYS.pdfQuotationShowStamp,
        ],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const accent = map.get(APP_SETTING_KEYS.pdfQuotationAccentColor);
  const isHex = accent && /^#[0-9A-Fa-f]{6}$/.test(accent);
  return {
    headerTitle:
      (map.get(APP_SETTING_KEYS.pdfQuotationHeaderTitle) || '').trim() ||
      DEFAULT_QUOTATION_PDF_THEME.headerTitle,
    accentColor: isHex ? (accent as string) : DEFAULT_QUOTATION_PDF_THEME.accentColor,
    footerNote: map.get(APP_SETTING_KEYS.pdfQuotationFooterNote) ?? DEFAULT_QUOTATION_PDF_THEME.footerNote,
    showStamp: map.get(APP_SETTING_KEYS.pdfQuotationShowStamp) === 'true',
  };
}

/**
 * 사용자가 환경설정에서 편집한 PDF Handlebars 템플릿을 반환한다.
 * 미설정 시 코드의 기본 템플릿을 사용 (quotationPdf.ts 의 DEFAULT_QUOTATION_PDF_TEMPLATE).
 * 순환 import 를 피하기 위해 여기서는 빈 문자열을 폴백 신호로 두지 않고,
 * 실제 기본 템플릿은 호출 측에서 처리하도록 한다.
 */
export async function getQuotationPdfTemplate(): Promise<string> {
  const v = await getSetting(APP_SETTING_KEYS.pdfQuotationTemplate);
  if (v && v.trim().length > 0) return v;
  // 동적 import 로 순환 의존성 회피
  const mod = await import('./quotationPdf');
  return mod.DEFAULT_QUOTATION_PDF_TEMPLATE;
}

/** IP 화이트리스트 활성 여부. 비활성이거나 규칙이 없으면 모든 IP 허용. */
export async function getIpFilterEnabled(): Promise<boolean> {
  const v = await getSetting(APP_SETTING_KEYS.ipFilterEnabled);
  return v === 'true';
}

export async function setIpFilterEnabled(enabled: boolean): Promise<void> {
  await setSetting(APP_SETTING_KEYS.ipFilterEnabled, enabled ? 'true' : 'false');
}

/** 접속 로그 보존 일수 (0 또는 음수 → 자동 삭제 비활성). */
export async function getAccessLogRetentionDays(): Promise<number> {
  const v = await getSetting(APP_SETTING_KEYS.accessLogRetentionDays);
  if (!v) return 0;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export async function setAccessLogRetentionDays(days: number | null): Promise<void> {
  if (days === null || !Number.isFinite(days) || days <= 0) {
    await deleteSetting(APP_SETTING_KEYS.accessLogRetentionDays);
    return;
  }
  await setSetting(APP_SETTING_KEYS.accessLogRetentionDays, String(Math.floor(days)));
}

export async function setQuotationPdfTemplate(template: string | null): Promise<void> {
  if (template === null || template.trim().length === 0) {
    await deleteSetting(APP_SETTING_KEYS.pdfQuotationTemplate);
    return;
  }
  await setSetting(APP_SETTING_KEYS.pdfQuotationTemplate, template);
}

export async function setQuotationPdfTheme(theme: Partial<QuotationPdfTheme>): Promise<void> {
  if (typeof theme.headerTitle === 'string') {
    const v = theme.headerTitle.trim();
    if (v) await setSetting(APP_SETTING_KEYS.pdfQuotationHeaderTitle, v);
    else await deleteSetting(APP_SETTING_KEYS.pdfQuotationHeaderTitle);
  }
  if (typeof theme.accentColor === 'string') {
    const v = theme.accentColor.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      await setSetting(APP_SETTING_KEYS.pdfQuotationAccentColor, v);
    } else if (!v) {
      await deleteSetting(APP_SETTING_KEYS.pdfQuotationAccentColor);
    }
  }
  if (typeof theme.footerNote === 'string') {
    if (theme.footerNote) await setSetting(APP_SETTING_KEYS.pdfQuotationFooterNote, theme.footerNote);
    else await deleteSetting(APP_SETTING_KEYS.pdfQuotationFooterNote);
  }
  if (typeof theme.showStamp === 'boolean') {
    await setSetting(APP_SETTING_KEYS.pdfQuotationShowStamp, theme.showStamp ? 'true' : 'false');
  }
}

// ---------- 사업자등록증 (회사 인증 첨부) ----------
// 실제 파일은 FILE_STORAGE/ 디렉토리에 저장되고, 이 setting 은 메타정보(파일명/타입/크기/저장명)만 담는다.

export interface BusinessRegistrationRecord {
  filename: string; // 사용자가 업로드한 원본 파일명
  mimetype: string;
  size: number;
  storedFilename: string; // FILE_STORAGE 안의 실제 저장명
}

export type BusinessRegistrationMeta = Pick<BusinessRegistrationRecord, 'filename' | 'mimetype' | 'size'>;

export async function getBusinessRegistration(): Promise<BusinessRegistrationRecord | null> {
  const v = await getSetting(APP_SETTING_KEYS.companyBusinessRegistration);
  if (!v) return null;
  try {
    const parsed = JSON.parse(v) as BusinessRegistrationRecord;
    if (
      typeof parsed.filename === 'string' &&
      typeof parsed.mimetype === 'string' &&
      typeof parsed.storedFilename === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getBusinessRegistrationMeta(): Promise<BusinessRegistrationMeta | null> {
  const file = await getBusinessRegistration();
  if (!file) return null;
  return { filename: file.filename, mimetype: file.mimetype, size: file.size };
}

export async function setBusinessRegistration(record: BusinessRegistrationRecord): Promise<void> {
  await setSetting(APP_SETTING_KEYS.companyBusinessRegistration, JSON.stringify(record));
}

export async function deleteBusinessRegistration(): Promise<void> {
  await deleteSetting(APP_SETTING_KEYS.companyBusinessRegistration);
}

export async function setCompanyProfile(profile: Partial<CompanyProfile>): Promise<void> {
  const mapping: { field: keyof CompanyProfile; key: string }[] = [
    { field: 'name', key: APP_SETTING_KEYS.companyName },
    { field: 'businessNumber', key: APP_SETTING_KEYS.companyBusinessNumber },
    { field: 'representative', key: APP_SETTING_KEYS.companyRepresentative },
    { field: 'address', key: APP_SETTING_KEYS.companyAddress },
    { field: 'phone', key: APP_SETTING_KEYS.companyPhone },
    { field: 'fax', key: APP_SETTING_KEYS.companyFax },
    { field: 'email', key: APP_SETTING_KEYS.companyEmail },
    { field: 'contactPerson', key: APP_SETTING_KEYS.companyContactPerson },
    { field: 'contactPhone', key: APP_SETTING_KEYS.companyContactPhone },
  ];
  for (const { field, key } of mapping) {
    const value = profile[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) await setSetting(key, trimmed);
    else await deleteSetting(key);
  }
}
