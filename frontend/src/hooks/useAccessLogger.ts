import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { accessLogApi } from '../api/accessLogs';
import { useAuth } from '../contexts/AuthContext';

/**
 * 라우트 변경 시마다 백엔드에 접속 로그를 비동기로 기록한다.
 * - 비로그인 상태에선 기록하지 않음
 * - 같은 path 의 연속 호출은 무시 (히스토리 패치 등으로 같은 경로가 중복 트리거될 때)
 * - 실패해도 사용자 경험엔 영향 없음 (silent)
 */
export function useAccessLogger() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      lastPathRef.current = null;
      return;
    }
    const path = location.pathname + location.search;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;

    const label = labelForPath(location.pathname);
    accessLogApi.record(path, label).catch(() => undefined);
  }, [user, location.pathname, location.search]);
}

/**
 * 경로 → 사람이 읽기 좋은 라벨 매핑.
 * 정확히 매칭 / 접두 매칭 순으로 평가.
 */
const PATH_LABELS: { match: RegExp; label: string }[] = [
  { match: /^\/quotations\/new\/?$/, label: '견적서 - 신규 작성' },
  { match: /^\/quotations\/[^/]+\/edit\/?$/, label: '견적서 - 수정' },
  { match: /^\/quotations\/[^/]+\/?$/, label: '견적서 - 상세' },
  { match: /^\/quotations\/?$/, label: '견적서 - 목록' },
  { match: /^\/contracts\/new\/?$/, label: '계약 - 신규 작성' },
  { match: /^\/contracts\/[^/]+\/edit\/?$/, label: '계약 - 수정' },
  { match: /^\/contracts\/[^/]+\/?$/, label: '계약 - 상세' },
  { match: /^\/contracts\/?$/, label: '계약 - 목록' },
  { match: /^\/expenses\/new\/?$/, label: '경비 - 신규 작성' },
  { match: /^\/expenses\/[^/]+\/edit\/?$/, label: '경비 - 수정' },
  { match: /^\/expenses\/?$/, label: '경비 - 목록' },
  { match: /^\/customers\/new\/?$/, label: '고객 - 신규' },
  { match: /^\/customers\/[^/]+\/edit\/?$/, label: '고객 - 수정' },
  { match: /^\/customers\/?$/, label: '고객 - 목록' },
  { match: /^\/products\/new\/?$/, label: '품목 - 신규' },
  { match: /^\/products\/[^/]+\/edit\/?$/, label: '품목 - 수정' },
  { match: /^\/products\/?$/, label: '품목 - 목록' },
  { match: /^\/users\/new\/?$/, label: '사용자 - 신규' },
  { match: /^\/users\/[^/]+\/edit\/?$/, label: '사용자 - 수정' },
  { match: /^\/users\/?$/, label: '사용자 - 목록' },
  { match: /^\/access-logs\/?$/, label: '접속 로그' },
  { match: /^\/access-rules\/?$/, label: '접속 허용 IP' },
  { match: /^\/settings\/?$/, label: '환경설정' },
  { match: /^\/login\/?$/, label: '로그인' },
];

export function labelForPath(pathname: string): string | null {
  for (const { match, label } of PATH_LABELS) {
    if (match.test(pathname)) return label;
  }
  return null;
}
