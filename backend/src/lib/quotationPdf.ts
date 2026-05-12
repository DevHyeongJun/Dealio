import puppeteer, { type Browser } from 'puppeteer';
import Handlebars from 'handlebars';
import type { Quotation, QuotationItem } from '@prisma/client';
import type { CompanyProfile, QuotationPdfTheme } from './appSetting';
import { DEFAULT_QUOTATION_PDF_THEME, getQuotationPdfTemplate } from './appSetting';

export type QuotationItemWithUnit = QuotationItem & { product?: { unit: string } | null };
export type QuotationWithItems = Quotation & {
  items: QuotationItemWithUnit[];
  title?: string | null;
};

export interface RenderInput {
  quotation: QuotationWithItems;
  company: CompanyProfile;
  theme?: QuotationPdfTheme;
  /** 미리보기 등 임시 템플릿 주입용. 미설정 시 DB 저장 템플릿(또는 기본)을 사용. */
  templateOverride?: string;
}

const KRW = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

function formatKRW(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return '';
  return `₩${KRW.format(Math.round(num))}`;
}

function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return '';
  return KRW.format(num);
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let helpersRegistered = false;
function registerHelpers() {
  if (helpersRegistered) return;
  Handlebars.registerHelper('formatKRW', (v: unknown) => formatKRW(v as number | string));
  Handlebars.registerHelper('formatNumber', (v: unknown) => formatNumber(v as number | string));
  Handlebars.registerHelper('formatDate', (v: unknown) => formatDate(v as Date | string));
  Handlebars.registerHelper('addOne', (n: number) => Number(n) + 1);
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('or', (...args: unknown[]) => args.slice(0, -1).some((v) => !!v));
  Handlebars.registerHelper('and', (...args: unknown[]) => args.slice(0, -1).every((v) => !!v));
  helpersRegistered = true;
}

function buildContext(q: QuotationWithItems, company: CompanyProfile, theme: QuotationPdfTheme) {
  const total = Number(q.totalAmount);
  const supply = q.vatIncluded ? Math.round((total / 1.1) * 100) / 100 : total;
  const vat = q.vatIncluded ? total - supply : Math.round(total * 0.1 * 100) / 100;
  const grand = q.vatIncluded ? total : total + vat;
  const vatNote = q.vatIncluded
    ? '※ 합계금액은 부가세가 포함된 금액입니다.'
    : '※ 부가세는 별도입니다.';

  const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
  const dateLine = `${issueDate.getFullYear()}년 ${issueDate.getMonth() + 1}월 ${issueDate.getDate()}일`;

  const items = q.items.map((item) => {
    const unitLabel = item.product?.unit?.trim() || 'EA';
    const descLines = (item.description ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const descBlock = descLines.length
      ? `<div class="desc">${descLines.map((l) => `- ${escapeHtml(l)}`).join('<br/>')}</div>`
      : '';
    return {
      ...item,
      quantity: Number(item.quantity),
      unitPriceNum: Number(item.unitPrice),
      amountNum: Number(item.amount),
      unitLabel,
      descLines,
      descBlock,
    };
  });

  return {
    quotation: q,
    company,
    theme,
    items,
    totals: { supply, vat, grand, vatNote },
    dateLine,
    supplierHasNameRow: !!(company.name || company.representative),
    supplierHasContactRow: !!(company.contactPerson || company.contactPhone),
  };
}

export const DEFAULT_QUOTATION_PDF_TEMPLATE = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>견적서 {{quotation.quotationNumber}}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: "Noto Sans CJK KR", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif;
    font-size: 10pt;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .title-bar { text-align: center; margin-bottom: 8pt; }
  .title { font-size: 22pt; font-weight: bold; letter-spacing: 8pt; margin: 0; }
  .doc-no { font-size: 9pt; color: #6B7280; margin-top: 4pt; }
  .business-name {
    font-size: 12pt; font-weight: bold; color: #111827;
    margin-top: 10pt; padding-bottom: 6pt;
    border-bottom: 0.6pt solid #111827;
  }
  table.header-table {
    width: 100%; border-collapse: separate; border-spacing: 8pt 0;
    margin-top: 8pt; table-layout: fixed;
  }
  
  table.header-table > tbody > tr > td { vertical-align: top; padding: 0; width: 50%; }
  
  table.kv { width: 100%; border-collapse: collapse; border: 0.6pt solid #111827; }
  table.kv td {
    font-size: 10pt; padding: 6pt 8pt;
    border: 0.4pt solid #D1D5DB; line-height: 1.45;
  }
  table.kv td.label {
    background: #F3F4F6; color: #374151; font-weight: bold;
    width: 76pt; text-align: center;
  }
  table.kv td.value { color: #111827; word-break: break-all; }
  table.kv td.value.muted { color: #9CA3AF; }
  table.kv td.value.amount-cell { font-weight: bold; font-size: 14pt; color: {{theme.accentColor}}; text-align: right; }
  table.kv td.vat-row {
    text-align: right; color: #6B7280; font-size: 9pt;
    background: #FAFAFA; padding: 4pt 8pt;
  }
  table.supplier-kv td.label { width: 60pt; }
  .supplier-wrap { position: relative; }
  .stamp-circle {
    position: absolute; top: 8pt; right: 8pt;
    width: 50pt; height: 50pt;
    border: 0.8pt dashed #B91C1C; color: #B91C1C;
    border-radius: 50%; text-align: center; line-height: 50pt;
    font-size: 11pt; font-weight: bold; background: rgba(255,255,255,0.85);
  }
  table.items {
    width: 100%; border-collapse: collapse;
    margin-top: 14pt; border: 0.6pt solid #111827; table-layout: fixed;
  }
  table.items thead th {
    background: #F3F4F6; color: #111827; font-weight: bold; font-size: 10pt;
    padding: 7pt 6pt; text-align: center;
    border: 0.4pt solid #D1D5DB; border-bottom: 0.6pt solid #111827;
  }
  table.items tbody td {
    font-size: 10pt; padding: 6pt 8pt;
    border: 0.4pt solid #D1D5DB; vertical-align: top; word-break: break-all;
  }
  table.items td.no { text-align: center; width: 30pt; }
  table.items td.unit { text-align: center; width: 50pt; }
  table.items td.qty { text-align: right; width: 56pt; white-space: nowrap; }
  table.items td.price { text-align: right; width: 86pt; white-space: nowrap; }
  table.items td.amount { text-align: right; width: 96pt; white-space: nowrap; }
  table.items td.name { text-align: left; }
  table.items td.empty { text-align: center; color: #6B7280; padding: 14pt 8pt; }
  .desc { color: #6B7280; font-size: 9pt; margin-top: 3pt; line-height: 1.4; }
  table.items tfoot td {
    background: #FAFAFA; border: 0.4pt solid #D1D5DB;
    border-top: 0.6pt solid #111827; padding: 8pt 8pt; font-size: 10.5pt;
  }
  table.items tfoot td.sum-label { text-align: center; font-weight: bold; }
  table.items tfoot td.sum-value { text-align: right; font-weight: bold; color: {{theme.accentColor}}; }
  .vat-note { text-align: right; color: #6B7280; font-size: 9pt; margin-top: 6pt; }
  .notes-block { border: 0.6pt solid #111827; margin-top: 14pt; }
  .notes-header {
    background: #F3F4F6; font-weight: bold; padding: 6pt 10pt;
    border-bottom: 0.4pt solid #D1D5DB; text-align: center;
  }
  .notes-body { padding: 8pt 10pt; line-height: 1.5; font-size: 10pt; min-height: 36pt; white-space: pre-wrap; }
  .footer-date { text-align: center; font-size: 11pt; color: #111827; margin-top: 28pt; letter-spacing: 1pt; }
  .footer-company {
    text-align: center; font-size: 14pt; font-weight: bold;
    margin-top: 12pt; letter-spacing: 4pt;
  }
  .footer-note { text-align: center; font-size: 8.5pt; color: #6B7280; margin-top: 18pt; }
</style>
</head>
<body>

  <div class="title-bar">
    <h1 class="title">{{theme.headerTitle}}</h1>
    <div class="doc-no">No. {{quotation.quotationNumber}}</div>
  </div>

  {{#if quotation.title}}
  <div class="business-name">{{quotation.title}}</div>
  {{/if}}

  <table class="header-table">
    <tr>
      <td>
        <table class="kv">
          {{#if quotation.customerName}}
          <tr><td class="label">공급받는자</td><td class="value" colspan="3">{{quotation.customerName}}</td></tr>
          {{/if}}
          <tr><td class="label">발행일</td><td class="value" colspan="3">{{formatDate quotation.issueDate}}</td></tr>
          {{#if quotation.validUntil}}
          <tr><td class="label">견적유효기간</td><td class="value" colspan="3">{{formatDate quotation.validUntil}}</td></tr>
          {{/if}}
          <tr>
            <td class="label">총 금액</td>
            <td class="value amount-cell" colspan="3">{{formatKRW totals.grand}}</td>
          </tr>
          <tr>
            <td class="vat-row" colspan="4">{{totals.vatNote}}</td>
          </tr>
        </table>
      </td>
      <td>
        <div class="supplier-wrap">
          <table class="kv supplier-kv">
            {{#if company.businessNumber}}
            <tr><td class="label">사업자등록번호</td><td class="value" colspan="3">{{company.businessNumber}}</td></tr>
            {{/if}}
            {{#if supplierHasNameRow}}
            <tr>
              <td class="label">상호</td>
              <td class="value{{#unless company.name}} muted{{/unless}}">{{#if company.name}}{{company.name}}{{else}}-{{/if}}</td>
              <td class="label">대표자</td>
              <td class="value{{#unless company.representative}} muted{{/unless}}">{{#if company.representative}}{{company.representative}}{{else}}-{{/if}}</td>
            </tr>
            {{/if}}
            {{#if company.address}}
            <tr><td class="label">소재지</td><td class="value" colspan="3">{{company.address}}</td></tr>
            {{/if}}
            {{#if supplierHasContactRow}}
            <tr>
              <td class="label">담당자</td>
              <td class="value">{{#if company.contactPerson}}{{company.contactPerson}}{{else}}-{{/if}}</td>
              <td class="label">연락처</td>
              <td class="value">{{#if company.contactPhone}}{{company.contactPhone}}{{else}}-{{/if}}</td>
            </tr>
            {{/if}}
          </table>
          {{#if theme.showStamp}}
          <div class="stamp-circle">(인)</div>
          {{/if}}
        </div>
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr><th>No</th><th>품명</th><th>단위</th><th>수량</th><th>단가</th><th>금액</th></tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td class="no">{{addOne @index}}</td>
        <td class="name">{{name}}{{{descBlock}}}</td>
        <td class="unit">{{unitLabel}}</td>
        <td class="qty">{{formatNumber quantity}}</td>
        <td class="price">{{formatKRW unitPriceNum}}</td>
        <td class="amount">{{formatKRW amountNum}}</td>
      </tr>
      {{else}}
      <tr><td class="empty" colspan="6">(품목 없음)</td></tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr>
        <td class="sum-label" colspan="5">합 계</td>
        <td class="sum-value">{{formatKRW totals.grand}}</td>
      </tr>
    </tfoot>
  </table>
  <div class="vat-note">공급가액 {{formatKRW totals.supply}}  ·  부가세 {{formatKRW totals.vat}}</div>

  {{#if quotation.notes}}
  <section class="notes-block">
    <div class="notes-header">특이사항</div>
    <div class="notes-body">{{quotation.notes}}</div>
  </section>
  {{/if}}

  <div class="footer-date">{{dateLine}}</div>
  <div class="footer-company">{{company.name}}</div>

  {{#if theme.footerNote}}
  <div class="footer-note">{{theme.footerNote}}</div>
  {{/if}}
</body>
</html>`;

export function validateQuotationPdfTemplate(template: string): void {
  registerHelpers();
  Handlebars.compile(template, { strict: false });
}

export async function renderQuotationPdf({
  quotation,
  company,
  theme,
  templateOverride,
}: RenderInput): Promise<Buffer> {
  registerHelpers();
  const resolvedTheme = theme ?? DEFAULT_QUOTATION_PDF_THEME;
  const template = templateOverride ?? (await getQuotationPdfTemplate());
  const ctx = buildContext(quotation, company, resolvedTheme);
  let html: string;
  try {
    const tpl = Handlebars.compile(template, { strict: false });
    html = tpl(ctx);
  } catch {
    const tpl = Handlebars.compile(DEFAULT_QUOTATION_PDF_TEMPLATE, { strict: false });
    html = tpl(ctx);
  }
  return renderHtmlToPdf(html);
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      })
      .catch((e) => {
        browserPromise = null;
        throw e;
      });
  }
  return browserPromise;
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    const data = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    });
    return Buffer.from(data);
  } finally {
    await page.close().catch(() => undefined);
  }
}

export function buildPdfFilename(quotation: Pick<Quotation, 'quotationNumber' | 'customerName'>): string {
  const safeCustomer = (quotation.customerName || 'customer').replace(/[\\/:*?"<>|]/g, '_');
  return `견적서_${quotation.quotationNumber}_${safeCustomer}.pdf`;
}

/** 미리보기/샘플 더미 데이터 */
export function buildSampleQuotation(): QuotationWithItems {
  const now = new Date();
  const valid = new Date(now);
  valid.setDate(valid.getDate() + 30);
  return {
    id: 'sample',
    quotationNumber: 'Q-SAMPLE-001',
    title: '○○ 신축 공사 견적',
    customerId: null,
    customerName: '샘플 거래처',
    customerEmail: 'sample@example.com',
    customerPhone: '02-0000-0000',
    customerAddress: '서울시 강남구 ○○로 1',
    issueDate: now,
    validUntil: valid,
    status: 'DRAFT',
    totalAmount: 1100000 as unknown as never,
    vatIncluded: true,
    notes: '실제 공사 시 추가되는 비용 협의 가능합니다.',
    createdAt: now,
    updatedAt: now,
    createdById: null,
    updatedById: null,
    items: [
      { id: 's1', quotationId: 'sample', productId: null, name: '시멘트',
        description: '40kg / 포\n표준 등급', quantity: 100,
        unitPrice: 5000 as unknown as never, amount: 500000 as unknown as never,
        sortOrder: 0, product: { unit: 'kg' } } as unknown as QuotationItemWithUnit,
      { id: 's2', quotationId: 'sample', productId: null, name: '벽돌',
        description: null, quantity: 200,
        unitPrice: 100 as unknown as never, amount: 20000 as unknown as never,
        sortOrder: 1, product: { unit: 'EA' } } as unknown as QuotationItemWithUnit,
      { id: 's3', quotationId: 'sample', productId: null, name: '철근',
        description: null, quantity: 1,
        unitPrice: 580000 as unknown as never, amount: 580000 as unknown as never,
        sortOrder: 2, product: { unit: 'Ton' } } as unknown as QuotationItemWithUnit,
    ],
  } as unknown as QuotationWithItems;
}
