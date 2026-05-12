import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendMail, isMailerConfigured, MailerNotConfiguredError } from '@/lib/mailer';
import { htmlToText, resolveBodyHtml, resolveSubject } from '@/lib/quotationMail';
import { requireUser } from '@/lib/auth';
import { recordHistory, statusChangeSummary } from '@/lib/quotationHistory';
import { getBusinessRegistration, getCompanyProfile, getQuotationPdfTheme } from '@/lib/appSetting';
import { renderQuotationPdf, buildPdfFilename } from '@/lib/quotationPdf';
import { readFile as readStoredFile } from '@/lib/fileStorage';

const sendSchema = z.object({
  to: z
    .string()
    .min(1, '수신자 이메일을 입력하세요')
    .email('올바른 이메일 주소를 입력하세요'),
  cc: z
    .string()
    .email('올바른 이메일 주소를 입력하세요')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  markAsSent: z.boolean().optional().default(true),
  attachPdf: z.boolean().optional().default(true),
  attachBusinessRegistration: z.boolean().optional().default(false),
  attachBusinessCard: z.boolean().optional().default(false),
  /** 첨부할 명함의 사용자 ID (미지정 시 발송자 본인). 발송자와 같은 회사 소속만 허용 */
  businessCardUserId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  /** 이 견적서에 등록된 첨부파일 중 메일에 함께 보낼 항목 ID 목록 */
  attachmentIds: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

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

  if (!isMailerConfigured()) {
    const fallbackHtml = await resolveBodyHtml(quotation);
    const log = await prisma.quotationSendLog.create({
      data: {
        quotationId: quotation.id,
        userId: guard.user.id,
        recipient: input.to,
        cc: input.cc ?? null,
        subject: input.subject || (await resolveSubject(quotation)),
        body: input.body || htmlToText(fallbackHtml),
        status: 'FAIL',
        error: 'SMTP 환경변수가 설정되지 않았습니다.',
      },
    });
    await recordHistory(prisma, {
      quotationId: quotation.id,
      userId: guard.user.id,
      action: 'SEND',
      summary: `메일 발송 실패 → ${input.to} (SMTP 미설정)`,
      details: { recipient: input.to, status: 'FAIL', logId: log.id },
    });
    return NextResponse.json(
      { error: 'SMTP_NOT_CONFIGURED', log },
      { status: 503 }
    );
  }

  const subject = input.subject?.trim() || (await resolveSubject(quotation));
  // HTML 본문은 항상 환경설정 템플릿으로 발송. 텍스트 폴백은 HTML 에서 자동 추출.
  const html = await resolveBodyHtml(quotation);
  const text = input.body?.trim() || htmlToText(html);

  // 첨부 파일 (옵션): 견적서 PDF + 사업자등록증
  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  if (input.attachPdf) {
    try {
      const [company, theme] = await Promise.all([
        getCompanyProfile(),
        getQuotationPdfTheme(),
      ]);
      const pdf = await renderQuotationPdf({ quotation, company, theme });
      attachments.push({
        filename: buildPdfFilename(quotation),
        content: pdf,
        contentType: 'application/pdf',
      });
    } catch (e) {
      console.error('PDF 첨부 생성 실패:', e);
    }
  }
  if (input.attachBusinessRegistration) {
    try {
      const record = await getBusinessRegistration();
      if (record) {
        const buf = await readStoredFile(record.storedFilename);
        if (buf) {
          attachments.push({
            filename: record.filename,
            content: buf,
            contentType: record.mimetype,
          });
        }
      }
    } catch (e) {
      console.error('사업자등록증 첨부 실패:', e);
    }
  }
  if (input.attachBusinessCard) {
    try {
      const targetUserId = input.businessCardUserId || guard.user.id;
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true, name: true, companyId: true,
          businessCardPath: true, businessCardName: true,
        },
      });
      if (!targetUser) {
        return NextResponse.json({ error: '명함 사용자를 찾을 수 없습니다.' }, { status: 400 });
      }
      // 본인이 아니면 같은 회사 소속만 허용
      if (targetUser.id !== guard.user.id) {
        if (!guard.user.companyId || guard.user.companyId !== targetUser.companyId) {
          return NextResponse.json(
            { error: '같은 회사 소속의 사용자 명함만 첨부할 수 있습니다.' },
            { status: 403 },
          );
        }
      }
      if (!targetUser.businessCardPath) {
        return NextResponse.json(
          { error: `${targetUser.name} 의 명함이 등록되어 있지 않습니다.` },
          { status: 400 },
        );
      }
      const buf = await readStoredFile(targetUser.businessCardPath);
      if (buf) {
        const ext = targetUser.businessCardPath.split('.').pop()?.toLowerCase();
        const mimetype =
          ext === 'png' ? 'image/png' :
          ext === 'webp' ? 'image/webp' :
          'image/jpeg';
        attachments.push({
          filename: targetUser.businessCardName || `명함_${targetUser.name}.${ext ?? 'jpg'}`,
          content: buf,
          contentType: mimetype,
        });
      }
    } catch (e) {
      console.error('명함 첨부 실패:', e);
    }
  }

  // 이 견적서에 등록된 첨부파일 중 선택된 것들 — entityType/entityId 검증으로 다른 견적서 파일을 가로채는 것 차단
  if (input.attachmentIds && input.attachmentIds.length > 0) {
    const records = await prisma.attachment.findMany({
      where: {
        id: { in: input.attachmentIds },
        entityType: 'QUOTATION',
        entityId: quotation.id,
      },
    });
    if (records.length !== input.attachmentIds.length) {
      return NextResponse.json(
        { error: '이 견적서에 속하지 않은 첨부파일이 포함되어 있습니다.' },
        { status: 400 },
      );
    }
    for (const r of records) {
      try {
        const buf = await readStoredFile(r.storedFilename);
        if (buf) {
          attachments.push({
            filename: r.filename,
            content: buf,
            contentType: r.mimetype,
          });
        }
      } catch (e) {
        console.error(`첨부파일 (${r.id}) 읽기 실패:`, e);
      }
    }
  }

  const log = await prisma.quotationSendLog.create({
    data: {
      quotationId: quotation.id,
      userId: guard.user.id,
      recipient: input.to,
      cc: input.cc ?? null,
      subject,
      body: text,
      status: 'PENDING',
    },
  });

  try {
    const result = await sendMail({
      to: input.to,
      cc: input.cc ?? undefined,
      subject,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    const updated = await prisma.quotationSendLog.update({
      where: { id: log.id },
      data: { status: 'SUCCESS', messageId: result.messageId },
    });

    let statusChanged = false;
    if (input.markAsSent && quotation.status === 'DRAFT') {
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: 'SENT', updatedById: guard.user.id },
      });
      statusChanged = true;
    }

    await prisma.$transaction(async (tx) => {
      await recordHistory(tx, {
        quotationId: quotation.id,
        userId: guard.user.id,
        action: 'SEND',
        summary: `메일 발송 성공 → ${input.to}`,
        details: { recipient: input.to, cc: input.cc ?? null, status: 'SUCCESS', logId: log.id },
      });
      if (statusChanged) {
        await recordHistory(tx, {
          quotationId: quotation.id,
          userId: guard.user.id,
          action: 'STATUS_CHANGE',
          summary: statusChangeSummary('DRAFT', 'SENT'),
          details: { from: 'DRAFT', to: 'SENT', source: 'mail-send' },
        });
      }
    });

    return NextResponse.json({ ok: true, log: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const updated = await prisma.quotationSendLog.update({
      where: { id: log.id },
      data: {
        status: 'FAIL',
        error: e instanceof MailerNotConfiguredError ? message : message.slice(0, 500),
      },
    });
    await recordHistory(prisma, {
      quotationId: quotation.id,
      userId: guard.user.id,
      action: 'SEND',
      summary: `메일 발송 실패 → ${input.to}`,
      details: { recipient: input.to, status: 'FAIL', error: message.slice(0, 500), logId: log.id },
    });
    return NextResponse.json({ ok: false, log: updated, error: message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
