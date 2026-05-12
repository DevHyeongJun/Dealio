import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getCompanyProfile, getQuotationPdfTheme } from '@/lib/appSetting';
import {
  buildSampleQuotation,
  renderQuotationPdf,
  validateQuotationPdfTemplate,
} from '@/lib/quotationPdf';

const previewSchema = z.object({
  /** 임시 템플릿 — 미지정 시 저장된 템플릿(또는 기본) 사용 */
  template: z.string().max(80000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tpl = parsed.data.template;
  if (tpl) {
    try {
      validateQuotationPdfTemplate(tpl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: 'INVALID_PDF_TEMPLATE', message: `템플릿 문법 오류: ${msg}` },
        { status: 400 },
      );
    }
  }

  try {
    const [company, theme] = await Promise.all([getCompanyProfile(), getQuotationPdfTheme()]);
    const sample = buildSampleQuotation();
    const pdf = await renderQuotationPdf({
      quotation: sample,
      company,
      theme,
      templateOverride: tpl || undefined,
    });
    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `inline; filename="quotation_preview.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'PDF_RENDER_FAILED', message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
