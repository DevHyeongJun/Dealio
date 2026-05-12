/**
 * 간단한 IPv4 CIDR 매칭 + 안전 룰 캐시.
 *
 * 캐시 — 매 요청마다 DB 조회를 피하기 위해 메모리에 5초 캐시.
 * 룰 추가/수정/삭제 시 invalidate() 호출.
 */
import { prisma } from './prisma';
import { getIpFilterEnabled } from './appSetting';

interface CachedRules {
  enabled: boolean;
  rules: { cidr: string }[];
  loadedAt: number;
}

let cache: CachedRules | null = null;
const CACHE_TTL_MS = 5000;

export function invalidateIpRuleCache(): void {
  cache = null;
}

async function loadRules(): Promise<CachedRules> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache;
  const [enabled, rules] = await Promise.all([
    getIpFilterEnabled(),
    prisma.accessRule.findMany({ where: { enabled: true }, select: { cidr: true } }),
  ]);
  cache = { enabled, rules, loadedAt: Date.now() };
  return cache;
}

/** 클라이언트 IP 가 화이트리스트 정책상 허용되는지 판단. */
export async function isIpAllowed(ip: string | null): Promise<boolean> {
  // 항상 허용: localhost / loopback (서버 내부에서 관리)
  if (!ip) return true; // IP 못 구하면 통과 (정책 미적용 시 안전한 기본)
  if (isLoopback(ip)) return true;

  const { enabled, rules } = await loadRules();
  // 기능 비활성 또는 룰 없음 → 모두 허용 (잠금 방지)
  if (!enabled) return true;
  if (rules.length === 0) return true;

  return rules.some((r) => matchCidr(ip, r.cidr));
}

function isLoopback(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/** IPv4 CIDR 매칭. IPv6 는 정확 매칭만 (간이). */
export function matchCidr(ip: string, cidr: string): boolean {
  // IPv6-mapped IPv4 ("::ffff:192.168.0.1") 정규화
  const cleanIp = ip.replace(/^::ffff:/, '');

  // CIDR 가 아니면 정확 비교
  if (!cidr.includes('/')) {
    return cleanIp === cidr.trim();
  }

  const [base, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipv4ToInt(cleanIp);
  const baseNum = ipv4ToInt(base.trim());
  if (ipNum === null || baseNum === null) return false;

  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0 || n > 255 || !/^\d+$/.test(p)) return null;
    num = (num << 8) | n;
  }
  return num >>> 0;
}

/** CIDR 문법 검증 — API/UI 에서 사용. */
export function validateCidr(input: string): { ok: true } | { ok: false; error: string } {
  const v = input.trim();
  if (!v) return { ok: false, error: '비어있습니다' };

  // 단일 IP
  if (!v.includes('/')) {
    if (ipv4ToInt(v) === null) return { ok: false, error: '올바른 IPv4 가 아닙니다' };
    return { ok: true };
  }

  const [base, prefixStr] = v.split('/');
  if (ipv4ToInt(base.trim()) === null) return { ok: false, error: '올바른 IPv4 가 아닙니다' };
  const prefix = Number(prefixStr);
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) {
    return { ok: false, error: '/뒤의 prefix 는 0~32 사이여야 합니다' };
  }
  return { ok: true };
}
