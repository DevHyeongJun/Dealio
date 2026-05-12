export type CurrencyCode = 'KRW' | 'USD';

export function formatCurrency(value: number | string, currency: CurrencyCode = 'KRW'): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '-';
  const locale = currency === 'USD' ? 'en-US' : 'ko-KR';
  const fractionDigits = currency === 'USD' ? 2 : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
