import { useMemo } from 'react';

export interface YooAnPaginationProps {
  /** 현재 페이지 (1-based) */
  page: number;
  /** 페이지당 항목 수 */
  pageSize: number;
  /** 전체 항목 수 */
  total: number;
  /** 페이지 변경 콜백 (1-based) */
  onChange: (page: number) => void;
  /** 좌측에 표시되는 정보 행 (예: "1-100 / 총 1,234건"). false 로 숨김 */
  showInfo?: boolean;
  /** 페이지 번호 버튼 양옆에 보일 페이지 수 */
  siblings?: number;
  className?: string;
}

/**
 * 목록 페이지네이션.
 * - "처음 / 이전 / [1] 2 3 ... 10 / 다음 / 마지막"
 * - 모바일에선 페이지 번호 일부 생략
 * - 0건이면 렌더링 없음
 */
export default function YooAnPagination({
  page,
  pageSize,
  total,
  onChange,
  showInfo = true,
  siblings = 1,
  className = '',
}: YooAnPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const pages = useMemo(() => buildPageList(safePage, totalPages, siblings), [safePage, totalPages, siblings]);

  function go(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== safePage) onChange(next);
  }

  if (total === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center sm:justify-between gap-3 ${className}`}>
      {showInfo && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {start.toLocaleString()}–{end.toLocaleString()} / 총 {total.toLocaleString()}건
        </div>
      )}

      <nav className="inline-flex items-center gap-1" aria-label="페이지네이션">
        <NavButton onClick={() => go(1)} disabled={safePage === 1} label="처음">«</NavButton>
        <NavButton onClick={() => go(safePage - 1)} disabled={safePage === 1} label="이전">‹</NavButton>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-2 text-xs text-gray-400 dark:text-gray-500 select-none">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === safePage ? 'page' : undefined}
              className={[
                'min-w-[32px] h-8 px-2 text-xs rounded-md border tabular-nums',
                p === safePage
                  ? 'bg-brand-600 text-white border-brand-600 dark:bg-brand-500 dark:border-brand-500 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/60',
              ].join(' ')}
            >
              {p}
            </button>
          ),
        )}

        <NavButton onClick={() => go(safePage + 1)} disabled={safePage === totalPages} label="다음">›</NavButton>
        <NavButton onClick={() => go(totalPages)} disabled={safePage === totalPages} label="마지막">»</NavButton>
      </nav>
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="min-w-[32px] h-8 px-2 text-xs rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/** 페이지 번호 리스트 + '...' 생성 */
function buildPageList(current: number, total: number, siblings: number): (number | 'ellipsis')[] {
  if (total <= 1) return [1];

  const first = 1;
  const last = total;
  const left = Math.max(current - siblings, first);
  const right = Math.min(current + siblings, last);

  const items: (number | 'ellipsis')[] = [];

  // 항상 1
  items.push(first);

  if (left > first + 1) items.push('ellipsis');

  for (let p = Math.max(left, first + 1); p <= Math.min(right, last - 1); p++) {
    items.push(p);
  }

  if (right < last - 1) items.push('ellipsis');

  // 항상 마지막
  if (last !== first) items.push(last);

  return items;
}
