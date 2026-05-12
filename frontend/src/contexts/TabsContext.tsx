import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type SectionKey =
  | 'dashboard'
  | 'quotations'
  | 'contracts'
  | 'expenses'
  | 'customers'
  | 'products'
  | 'users'
  | 'settings';

interface SectionDef {
  key: SectionKey;
  label: string;
  base: string; // 매칭/기본 URL
}

export const SECTIONS: SectionDef[] = [
  { key: 'dashboard', label: '대시보드', base: '/dashboard' },
  { key: 'quotations', label: '견적서', base: '/quotations' },
  { key: 'contracts', label: '계약', base: '/contracts' },
  { key: 'expenses', label: '경비', base: '/expenses' },
  { key: 'customers', label: '고객', base: '/customers' },
  { key: 'products', label: '품목', base: '/products' },
  { key: 'users', label: '사용자', base: '/users' },
  { key: 'settings', label: '환경설정', base: '/settings' },
];

const SECTION_BY_KEY = new Map(SECTIONS.map((s) => [s.key, s]));

export function getSectionForPath(path: string): SectionDef | null {
  return (
    SECTIONS.find((s) => path === s.base || path.startsWith(s.base + '/')) ?? null
  );
}

export interface OpenTab {
  key: SectionKey;
  url: string; // 마지막 방문 URL (search 포함)
}

interface TabsContextValue {
  tabs: OpenTab[];
  activeKey: SectionKey | null;
  /** 탭 클릭 → 그 탭의 마지막 URL 로 이동 */
  switchTo: (key: SectionKey) => void;
  /** 탭 닫기 — 활성 탭이면 다음 탭(없으면 fallback)으로 이동 */
  closeTab: (key: SectionKey) => void;
  /** 모든 탭 닫기 (fallback 으로 이동) */
  closeAll: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const STORAGE_KEY = 'dealio.openTabs.v1';
const FALLBACK_URL = '/quotations';

function loadFromStorage(): OpenTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is OpenTab =>
        t && typeof t.key === 'string' && typeof t.url === 'string' && SECTION_BY_KEY.has(t.key as SectionKey),
    );
  } catch {
    return [];
  }
}

function saveToStorage(tabs: OpenTab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    /* ignore */
  }
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<OpenTab[]>(() => loadFromStorage());

  // localStorage 영속
  useEffect(() => {
    saveToStorage(tabs);
  }, [tabs]);

  // 위치 변경 시: 현재 path → section 으로 매핑하여 탭을 열거나 url 갱신
  // (인증/login 페이지 같이 section 이 매칭 안되는 경로는 무시)
  const lastPathRef = useRef<string>('');
  useEffect(() => {
    const fullUrl = location.pathname + location.search;
    if (fullUrl === lastPathRef.current) return;
    lastPathRef.current = fullUrl;

    const section = getSectionForPath(location.pathname);
    if (!section) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.key === section.key);
      if (existing) {
        if (existing.url === fullUrl) return prev;
        return prev.map((t) => (t.key === section.key ? { ...t, url: fullUrl } : t));
      }
      return [...prev, { key: section.key, url: fullUrl }];
    });
  }, [location.pathname, location.search]);

  const activeKey = useMemo(() => {
    const section = getSectionForPath(location.pathname);
    return section?.key ?? null;
  }, [location.pathname]);

  const switchTo = useCallback(
    (key: SectionKey) => {
      const tab = tabs.find((t) => t.key === key);
      const fallback = SECTION_BY_KEY.get(key)?.base ?? FALLBACK_URL;
      navigate(tab?.url ?? fallback);
    },
    [tabs, navigate],
  );

  const closeTab = useCallback(
    (key: SectionKey) => {
      setTabs((prev) => {
        // 마지막 탭은 닫지 못하게 한다 (항상 최소 1개 유지)
        if (prev.length <= 1) return prev;

        const idx = prev.findIndex((t) => t.key === key);
        if (idx === -1) return prev;
        const next = prev.filter((t) => t.key !== key);

        // 활성 탭을 닫는 경우 → 다음(또는 이전) 탭으로 이동
        if (key === activeKey) {
          const fallbackTab = next[idx] ?? next[idx - 1] ?? next[0];
          navigate(fallbackTab.url);
        }
        return next;
      });
    },
    [activeKey, navigate],
  );

  const closeAll = useCallback(() => {
    setTabs([]);
    navigate(FALLBACK_URL);
  }, [navigate]);

  const value = useMemo<TabsContextValue>(
    () => ({ tabs, activeKey, switchTo, closeTab, closeAll }),
    [tabs, activeKey, switchTo, closeTab, closeAll],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used inside <TabsProvider>');
  return ctx;
}

export function getSectionLabel(key: SectionKey): string {
  return SECTION_BY_KEY.get(key)?.label ?? key;
}
