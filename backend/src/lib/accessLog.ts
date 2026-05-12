import type { Prisma, PrismaClient } from '@prisma/client';
import { getAccessLogRetentionDays } from './appSetting';

export interface AccessLogInput {
  userId: string | null;
  path: string;
  label?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAccessLog(
  client: PrismaClient | Prisma.TransactionClient,
  input: AccessLogInput,
): Promise<void> {
  const path = input.path.slice(0, 500);
  const label = input.label ? input.label.slice(0, 200) : null;
  const userAgent = input.userAgent ? input.userAgent.slice(0, 500) : null;
  await client.accessLog.create({
    data: {
      userId: input.userId,
      path,
      label,
      ipAddress: input.ipAddress ?? null,
      userAgent,
    },
  });
  // 보존 기간 초과 로그 정리 — 24시간에 한 번만 트리거
  void maybeCleanupOldAccessLogs(client);
}

/**
 * 클라이언트 실제 IP 추출.
 *
 * 프록시 체인(예: client → Cloudflare → Apache → nginx → backend) 에서
 * 각 단계가 자기 IP 로 remote 를 덮어쓰기 때문에 헤더로 원본을 추적해야 한다.
 * 신뢰 우선순위:
 *  1. CF-Connecting-IP — Cloudflare 가 원본 클라이언트 IP 를 명시적으로 넣어줌 (가장 정확)
 *  2. True-Client-IP  — Akamai 등 CDN
 *  3. X-Forwarded-For — proxy 체인 (첫 번째 항목이 원본 클라이언트)
 *  4. X-Real-IP       — 직전 proxy 가 설정 (최후의 폴백)
 *
 * 주의: 헤더는 클라이언트가 위조할 수 있으므로 신뢰 가능한 proxy 만 앞단에 있을 때 의미가 있다.
 */
export function clientIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const tci = req.headers.get('true-client-ip');
  if (tci) return tci.trim();

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }

  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();

  return null;
}

// ---- 보존 기간 자동 정리 ----
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

async function maybeCleanupOldAccessLogs(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  try {
    await cleanupOldAccessLogs(client);
  } catch {
    // 정리 실패는 무시 (로깅만 하고 계속 진행)
  }
}

/** 즉시 정리 — 보존 일수 초과한 로그 삭제. 삭제된 건수 반환. */
export async function cleanupOldAccessLogs(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<{ deleted: number; cutoff: Date | null; retentionDays: number }> {
  const days = await getAccessLogRetentionDays();
  if (days <= 0) {
    return { deleted: 0, cutoff: null, retentionDays: 0 };
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await client.accessLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: res.count, cutoff, retentionDays: days };
}
