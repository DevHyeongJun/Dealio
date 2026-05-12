import type { Quotation, QuotationItem } from '@prisma/client';
import {
  getMailSubjectTemplate,
  getMailBodyHtmlTemplate,
  DEFAULT_MAIL_SUBJECT_TEMPLATE,
  DEFAULT_MAIL_BODY_HTML_TEMPLATE,
} from './appSetting';

type QuotationItemWithUnit = QuotationItem & { product?: { unit: string } | null };
type QuotationWithItems = Quotation & { items: QuotationItemWithUnit[] };

const KRW = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});
const DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function money(v: any): string {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? '-' : KRW.format(n);
}

function date(v: Date | null | undefined): string {
  if (!v) return '-';
  return DATE.format(v);
}

function placeholderMap(q: QuotationWithItems): Record<string, string> {
  return {
    quotationNumber: q.quotationNumber,
    customerName: q.customerName,
    customerEmail: q.customerEmail || '',
    totalAmount: money(q.totalAmount),
    issueDate: date(q.issueDate),
    validUntil: date(q.validUntil),
  };
}

export function renderSubject(template: string, q: QuotationWithItems): string {
  const map = placeholderMap(q);
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in map ? map[key] : `{${key}}`));
}

export function defaultSubject(q: QuotationWithItems): string {
  return renderSubject(DEFAULT_MAIL_SUBJECT_TEMPLATE, q);
}

export async function resolveSubject(q: QuotationWithItems): Promise<string> {
  const tpl = await getMailSubjectTemplate();
  return renderSubject(tpl, q);
}

export function previewSubject(template: string, sample: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in sample ? sample[key] : `{${key}}`));
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * HTML → 일반 텍스트 변환 (HTML 비호환 메일 클라이언트용 폴백).
 * <br>, </p>, </tr>, </div> 등은 줄바꿈으로 치환하고, 나머지 태그는 제거.
 */
export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  s = s.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  s = s.replace(/<\s*head[^>]*>[\s\S]*?<\s*\/\s*head\s*>/gi, '');
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\s*\/(p|div|tr|li|h\d|table|thead|tbody|tfoot|td|th)\s*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITY_MAP[m.toLowerCase()] ?? m);
  // 연속 공백/줄바꿈 정리
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n[ \t]+/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function buildDescriptionHtml(description: string | null | undefined): string {
  if (!description || !description.trim()) return '';
  const lines = description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `- ${escapeHtml(l)}`);
  if (lines.length === 0) return '';
  return `<div style="margin-top:4px;color:#6b7280;font-size:12px;white-space:pre-wrap;">${lines.join('<br/>')}</div>`;
}

function buildItemsTableHtml(q: QuotationWithItems): string {
  const rows = q.items
    .map((it) => {
      const unit = it.product?.unit?.trim() || 'EA';
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${escapeHtml(it.name)}${buildDescriptionHtml(it.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#4b5563;vertical-align:top;">${it.quantity} ${escapeHtml(unit)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#4b5563;vertical-align:top;">${money(it.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;vertical-align:top;">${money(it.amount)}</td>
      </tr>`;
    })
    .join('');

  return `
    <table style="border-collapse:collapse;width:100%;font-size:13px;color:#111827;">
      <thead>
        <tr style="background:#f9fafb;color:#6b7280;text-transform:uppercase;font-size:11px;letter-spacing:0.04em;">
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-weight:500;">품목</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;">수량</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;">단가</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;">금액</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;color:#6b7280;font-size:12px;">합계</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#111827;">${money(q.totalAmount)}</td>
        </tr>
        <tr>
          <td colspan="4" style="padding:0 12px 10px;text-align:right;color:#6b7280;font-size:12px;">
            ${q.vatIncluded ? '※ 합계금액은 부가세가 포함된 금액입니다.' : '※ 부가세는 별도입니다.'}
          </td>
        </tr>
      </tfoot>
    </table>`.trim();
}

function buildNotesHtmlBlock(q: QuotationWithItems): string {
  if (!q.notes) return '';
  return `<tr><td style="padding:0 32px 24px;color:#374151;font-size:13px;white-space:pre-wrap;">${escapeHtml(q.notes)}</td></tr>`;
}

function htmlBodyPlaceholderMap(q: QuotationWithItems): Record<string, string> {
  return {
    ...placeholderMap(q),
    itemsTable: buildItemsTableHtml(q),
    notesHtmlBlock: buildNotesHtmlBlock(q),
  };
}

export function renderBodyHtml(template: string, q: QuotationWithItems): string {
  const map = htmlBodyPlaceholderMap(q);
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in map ? map[key] : `{${key}}`));
}

export function defaultHtml(q: QuotationWithItems): string {
  return renderBodyHtml(DEFAULT_MAIL_BODY_HTML_TEMPLATE, q);
}

export async function resolveBodyHtml(q: QuotationWithItems): Promise<string> {
  const tpl = await getMailBodyHtmlTemplate();
  return renderBodyHtml(tpl, q);
}

export function previewBodyHtml(template: string, sample: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in sample ? sample[key] : `{${key}}`));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
