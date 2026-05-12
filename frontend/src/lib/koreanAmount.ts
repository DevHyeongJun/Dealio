// 숫자를 한글 금액 표기로 변환합니다 (예: 1234567 → "금일백이십삼만사천오백육십칠원정")

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const DIGIT_UNITS = ['', '십', '백', '천'];
const BIG_UNITS = ['', '만', '억', '조', '경'];

function fourDigitsToKorean(n: number): string {
  if (n === 0) return '';
  let s = '';
  const str = String(n).padStart(4, '0');
  for (let i = 0; i < 4; i++) {
    const d = Number(str[i]);
    if (d === 0) continue;
    // "일" 은 십·백·천 단위에서 생략 (예: "일십" 대신 "십")
    const digit = d === 1 && i < 3 ? '' : DIGITS[d];
    s += digit + DIGIT_UNITS[3 - i];
  }
  return s;
}

export function toKoreanAmount(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '금영원정';

  const negative = n < 0;
  let abs = Math.floor(Math.abs(n));
  const parts: string[] = [];
  let unitIdx = 0;
  while (abs > 0 && unitIdx < BIG_UNITS.length) {
    const chunk = abs % 10000;
    if (chunk > 0) {
      parts.unshift(fourDigitsToKorean(chunk) + BIG_UNITS[unitIdx]);
    }
    abs = Math.floor(abs / 10000);
    unitIdx += 1;
  }
  return `${negative ? '금-' : '금'}${parts.join('')}원정`;
}

export function formatComma(value: string | number): string {
  const digits = String(value).replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export function parseDigits(value: string): number {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}
