import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, requireAdmin } from '@/lib/auth';
import {
  APP_SETTING_KEYS,
  DEFAULT_MAIL_SUBJECT_TEMPLATE,
  DEFAULT_MAIL_BODY_HTML_TEMPLATE,
  DEFAULT_QUOTATION_PDF_THEME,
  MAIL_SUBJECT_PLACEHOLDERS,
  MAIL_BODY_HTML_PLACEHOLDERS,
  COMPANY_FIELD_LABELS,
  QUOTATION_PDF_FIELD_LABELS,
  getMailSubjectTemplate,
  getMailBodyHtmlTemplate,
  getCompanyProfile,
  getQuotationPdfTheme,
  getBusinessRegistrationMeta,
  getQuotationPdfTemplate,
  getAccessLogRetentionDays,
  getIpFilterEnabled,
  setCompanyProfile,
  setQuotationPdfTheme,
  setQuotationPdfTemplate,
  setAccessLogRetentionDays,
  setIpFilterEnabled,
  setSetting,
} from '@/lib/appSetting';
import { previewSubject, previewBodyHtml } from '@/lib/quotationMail';
import { DEFAULT_QUOTATION_PDF_TEMPLATE, validateQuotationPdfTemplate } from '@/lib/quotationPdf';

async function buildResponse() {
  const mailSubjectTemplate = await getMailSubjectTemplate();
  const mailBodyHtmlTemplate = await getMailBodyHtmlTemplate();
  const company = await getCompanyProfile();
  const quotationPdf = await getQuotationPdfTheme();
  const quotationPdfTemplate = await getQuotationPdfTemplate();
  const accessLogRetentionDays = await getAccessLogRetentionDays();
  const ipFilterEnabled = await getIpFilterEnabled();
  const businessRegistration = await getBusinessRegistrationMeta();
  const subjectSample = Object.fromEntries(MAIL_SUBJECT_PLACEHOLDERS.map((p) => [p.key, p.sample]));
  const htmlBodySample = Object.fromEntries(MAIL_BODY_HTML_PLACEHOLDERS.map((p) => [p.key, p.sample]));

  return {
    mailSubjectTemplate,
    mailSubjectPreview: previewSubject(mailSubjectTemplate, subjectSample),
    mailBodyHtmlTemplate,
    mailBodyHtmlPreview: previewBodyHtml(mailBodyHtmlTemplate, htmlBodySample),
    company,
    companyFieldLabels: COMPANY_FIELD_LABELS,
    businessRegistration,
    quotationPdf,
    quotationPdfFieldLabels: QUOTATION_PDF_FIELD_LABELS,
    quotationPdfTemplate,
    accessLogRetentionDays,
    ipFilterEnabled,
    defaults: {
      mailSubjectTemplate: DEFAULT_MAIL_SUBJECT_TEMPLATE,
      mailBodyHtmlTemplate: DEFAULT_MAIL_BODY_HTML_TEMPLATE,
      quotationPdf: DEFAULT_QUOTATION_PDF_THEME,
      quotationPdfTemplate: DEFAULT_QUOTATION_PDF_TEMPLATE,
    },
    placeholders: MAIL_SUBJECT_PLACEHOLDERS,
    htmlBodyPlaceholders: MAIL_BODY_HTML_PLACEHOLDERS,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  return NextResponse.json(await buildResponse());
}

const companyFieldSchema = z.string().max(200, '200자 이내로 입력하세요').optional();

const putSchema = z.object({
  mailSubjectTemplate: z
    .string()
    .min(1, '메일 제목 형식은 비워둘 수 없습니다')
    .max(200, '메일 제목 형식은 200자 이내로 입력하세요')
    .optional(),
  mailBodyHtmlTemplate: z
    .string()
    .min(1, '메일 HTML 본문은 비워둘 수 없습니다')
    .max(40000, 'HTML 본문은 40000자 이내로 입력하세요')
    .optional(),
  company: z
    .object({
      name: companyFieldSchema,
      businessNumber: companyFieldSchema,
      representative: companyFieldSchema,
      address: companyFieldSchema,
      phone: companyFieldSchema,
      fax: companyFieldSchema,
      email: companyFieldSchema,
      contactPerson: companyFieldSchema,
      contactPhone: companyFieldSchema,
    })
    .partial()
    .optional(),
  quotationPdf: z
    .object({
      headerTitle: z.string().max(50, '50자 이내로 입력하세요').optional(),
      accentColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, '#RRGGBB 형식의 6자리 hex 색상이어야 합니다')
        .optional(),
      footerNote: z.string().max(200, '200자 이내로 입력하세요').optional(),
      showStamp: z.boolean().optional(),
    })
    .partial()
    .optional(),
  quotationPdfTemplate: z
    .string()
    .max(80000, 'PDF 템플릿은 80000자 이내로 입력하세요')
    .nullable()
    .optional(),
  accessLogRetentionDays: z
    .number()
    .int()
    .min(0, '0 이상이어야 합니다 (0 = 자동 삭제 비활성)')
    .max(36500, '최대 36500일(100년)까지 입력 가능합니다')
    .nullable()
    .optional(),
  ipFilterEnabled: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (typeof parsed.data.mailSubjectTemplate === 'string') {
    await setSetting(APP_SETTING_KEYS.mailSubjectTemplate, parsed.data.mailSubjectTemplate.trim());
  }
  if (typeof parsed.data.mailBodyHtmlTemplate === 'string') {
    await setSetting(APP_SETTING_KEYS.mailBodyHtmlTemplate, parsed.data.mailBodyHtmlTemplate);
  }
  if (parsed.data.company) {
    await setCompanyProfile(parsed.data.company);
  }
  if (parsed.data.quotationPdf) {
    await setQuotationPdfTheme(parsed.data.quotationPdf);
  }
  if (parsed.data.quotationPdfTemplate !== undefined) {
    const tpl = parsed.data.quotationPdfTemplate;
    // null 또는 빈 문자열은 기본 템플릿으로 리셋
    if (tpl === null || tpl.trim().length === 0) {
      await setQuotationPdfTemplate(null);
    } else {
      // Handlebars 컴파일 검증
      try {
        validateQuotationPdfTemplate(tpl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
          { error: 'INVALID_PDF_TEMPLATE', message: `PDF 템플릿 문법 오류: ${msg}` },
          { status: 400 },
        );
      }
      await setQuotationPdfTemplate(tpl);
    }
  }
  if (parsed.data.accessLogRetentionDays !== undefined) {
    await setAccessLogRetentionDays(parsed.data.accessLogRetentionDays);
  }
  if (parsed.data.ipFilterEnabled !== undefined) {
    await setIpFilterEnabled(parsed.data.ipFilterEnabled);
    const { invalidateIpRuleCache } = await import('@/lib/ipFilter');
    invalidateIpRuleCache();
  }

  return NextResponse.json(await buildResponse());
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
