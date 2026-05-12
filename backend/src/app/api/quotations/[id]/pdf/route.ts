import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getCompanyProfile, getQuotationPdfTheme } from '@/lib/appSetting';
import { renderQuotationPdf, buildPdfFilename } from '@/lib/quotationPdf';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { product: { select: { unit: true } } },
      },
    },
  });
  if (!quotation) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  try {
    const [company, theme] = await Promise.all([
      getCompanyProfile(),
      getQuotationPdfTheme(),
    ]);
    const pdf = await renderQuotationPdf({ quotation, company, theme });

    const filename = buildPdfFilename(quotation);
    // RFC 5987: 한글 파일명 보존
    const encoded = encodeURIComponent(filename);

    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `attachment; filename="quotation_${quotation.quotationNumber}.pdf"; filename*=UTF-8''${encoded}`,
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
