import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSessionCookie, getSessionUser } from '@/lib/auth';
import { recordAccessLog, clientIp } from '@/lib/accessLog';

export async function POST(req: NextRequest) {
  // 세션이 있다면 로그아웃 이벤트 기록 — 쿠키 정리 전에 사용자 식별
  try {
    const user = await getSessionUser(req);
    if (user) {
      await recordAccessLog(prisma, {
        userId: user.id,
        path: '/auth/logout',
        label: `로그아웃 (${user.username})`,
        ipAddress: clientIp(req),
        userAgent: req.headers.get('user-agent'),
      });
    }
  } catch {
    // 로깅 실패는 무시
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
