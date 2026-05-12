import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { User, UserRole } from '@prisma/client';

export { hashPassword, verifyPassword } from '@/lib/password';

const SESSION_COOKIE = 'dealio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-insecure-secret-change-me';
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export interface SessionPayload {
  sub: string;
  username: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function signSession(user: Pick<User, 'id' | 'username' | 'name' | 'role'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(createHmac('sha256', getSecret()).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = base64url(createHmac('sha256', getSecret()).update(`${header}.${body}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromBase64url(body).toString('utf8')) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export function getSessionTokenFromCookies(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(req?: NextRequest): Promise<User | null> {
  const token = req ? getSessionTokenFromRequest(req) : getSessionTokenFromCookies();
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  return user;
}

// HTTPS 가 아닌 사내망/HTTP 배포에서도 쿠키가 동작해야 하므로
// NODE_ENV 가 아닌 명시 환경변수 COOKIE_SECURE 로 제어한다 (기본 false).
// HTTPS 운영 시에만 COOKIE_SECURE=true 로 설정.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: 0,
  });
}

export function unauthorized(message = 'UNAUTHORIZED') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'FORBIDDEN') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** request → 클라이언트 IP (XFF 우선, X-Real-IP, 그 외 null) */
export function clientIpFromRequest(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}

/** IP 화이트리스트 체크 — 차단되면 403 NextResponse 반환, 허용되면 null */
export async function checkIpAllowed(req: NextRequest): Promise<NextResponse | null> {
  const { isIpAllowed } = await import('./ipFilter');
  const ip = clientIpFromRequest(req);
  if (await isIpAllowed(ip)) return null;
  return NextResponse.json(
    { error: 'IP_NOT_ALLOWED', message: `접근이 허용되지 않은 IP 입니다: ${ip ?? '(unknown)'}` },
    { status: 403 },
  );
}

export async function requireUser(
  req: NextRequest,
): Promise<{ user: User } | NextResponse> {
  // IP 화이트리스트 우선 검사 (인증 전 단계)
  const ipBlock = await checkIpAllowed(req);
  if (ipBlock) return ipBlock;

  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  return { user };
}

export async function requireAdmin(
  req: NextRequest,
): Promise<{ user: User } | NextResponse> {
  const result = await requireUser(req);
  if (result instanceof NextResponse) return result;
  if (result.user.role !== 'ADMIN') return forbidden();
  return result;
}

export function publicUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}
