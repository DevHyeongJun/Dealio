import { NextRequest, NextResponse } from 'next/server';

/**
 * 동적 CORS 미들웨어.
 *
 * CORS_ORIGIN 환경변수:
 *   - 미설정 또는 '*' → 모든 origin 허용 (request 의 Origin 을 그대로 echo + credentials 허용).
 *     주의: 프로덕션에서 무제한 허용은 위험하므로 가능하면 명시 origin 사용 권장.
 *   - 콤마 구분 리스트 (예: "http://localhost:3000,http://192.168.0.10:3000")
 *     → 매칭되는 origin 만 echo, 비매칭은 헤더 미부착 (브라우저가 차단).
 *   - 단일 origin (예: "https://app.example.com") → 그 origin 만 허용.
 *
 * credentials (쿠키) 인증을 쓰므로 'Allow-Origin: *' 는 사용하지 않고 항상 구체 origin 을 echo.
 */

function parseAllowed(): { wildcard: boolean; list: string[] } {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') return { wildcard: true, list: [] };
  return {
    wildcard: false,
    list: raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  };
}

function allowedOrigin(reqOrigin: string | null): string | null {
  if (!reqOrigin) return null;
  const { wildcard, list } = parseAllowed();
  if (wildcard) return reqOrigin;
  return list.includes(reqOrigin) ? reqOrigin : null;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = allowedOrigin(origin);

  // OPTIONS preflight 즉시 응답
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (allowed) {
      res.headers.set('Access-Control-Allow-Origin', allowed);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');
    return res;
  }

  const res = NextResponse.next();
  if (allowed) {
    res.headers.set('Access-Control-Allow-Origin', allowed);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
