import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/user';
import {
  checkIpAllowed,
  publicUser,
  setSessionCookie,
  signSession,
  verifyPassword,
} from '@/lib/auth';
import { recordAccessLog, clientIp } from '@/lib/accessLog';

async function logAttempt(req: NextRequest, opts: {
  userId: string | null;
  label: string;
}) {
  try {
    await recordAccessLog(prisma, {
      userId: opts.userId,
      path: '/auth/login',
      label: opts.label,
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent'),
    });
  } catch {
    // 로깅 실패는 인증 흐름에 영향 주면 안됨
  }
}

export async function POST(req: NextRequest) {
  // IP 화이트리스트 — 비허용 IP 는 로그인 자체 차단
  const ipBlock = await checkIpAllowed(req);
  if (ipBlock) {
    await logAttempt(req, { userId: null, label: '로그인 차단: 허용되지 않은 IP' });
    return ipBlock;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    await logAttempt(req, { userId: null, label: '로그인 실패: 입력 형식 오류' });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const username = parsed.data.username;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    await logAttempt(req, { userId: null, label: `로그인 실패: 존재하지 않는 계정 (${username})` });
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }
  if (!user.isActive) {
    await logAttempt(req, { userId: user.id, label: `로그인 실패: 비활성 계정 (${username})` });
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    await logAttempt(req, { userId: user.id, label: `로그인 실패: 비밀번호 불일치 (${username})` });
    return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  await logAttempt(req, { userId: user.id, label: `로그인 성공 (${username})` });

  const token = signSession(user);
  const res = NextResponse.json({ user: publicUser(user) });
  setSessionCookie(res, token);
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
