import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface YooAnPickerProps<T> {
  /** 현재 선택된 값. 비어 있으면 placeholder 표시. */
  value: T | null;
  /** 인풋박스에 표시할 텍스트 (선택된 값에서 추출). */
  renderSelected: (value: T) => string;
  /** placeholder. */
  placeholder?: string;
  /** 모달에서 보여줄 한 항목의 렌더러. */
  renderItem: (item: T) => ReactNode;
  /** 검색어로 호출되는 비동기 검색 함수. 빈 문자열 호출은 모달 첫 진입 시 1회 발생. */
  onSearch: (query: string) => Promise<T[]>;
  /** 항목 선택 시 호출. */
  onSelect: (item: T) => void;
  /** 선택 해제 (null 처리). 제공되지 않으면 X 버튼 숨김. */
  onClear?: () => void;
  /** 모달 타이틀. */
  title?: string;
  /** 검색 입력 placeholder. */
  searchPlaceholder?: string;
  /** 항목의 안정 key 추출. */
  itemKey: (item: T) => string;
  /** 비활성. */
  disabled?: boolean;
  /** invalid 상태 (border 색 변경). */
  invalid?: boolean;
  /** className 전달. */
  className?: string;
}

const SearchIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function YooAnPicker<T>({
  value,
  renderSelected,
  placeholder = '선택하세요',
  renderItem,
  onSearch,
  onSelect,
  onClear,
  title = '선택',
  searchPlaceholder = '검색어 입력',
  itemKey,
  disabled = false,
  invalid = false,
  className = '',
}: YooAnPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  // 모달 첫 오픈 시 1회 검색
  useEffect(() => {
    if (!open) return;
    setError(null);
    setQuery('');
    runSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function runSearch(q: string) {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const items = await onSearch(q);
      if (id === reqIdRef.current) setResults(items);
    } catch (e) {
      if (id === reqIdRef.current) {
        setError(e instanceof Error ? e.message : '불러오기에 실패했습니다.');
      }
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }

  function handleSelect(item: T) {
    onSelect(item);
    setOpen(false);
  }

  const fieldBase =
    'w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-900 border text-left text-sm rounded-md disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2';
  const fieldBorder = invalid
    ? 'border-red-400 focus:ring-red-500 dark:border-red-500'
    : 'border-gray-300 dark:border-slate-700 focus:ring-brand-500';

  const displayText = value ? renderSelected(value) : '';

  return (
    <>
      <div className={`relative ${className}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          {SearchIcon}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`${fieldBase} ${fieldBorder} ${displayText ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
        >
          {displayText || placeholder}
        </button>
        {value && onClear && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label="선택 해제"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  {SearchIcon}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runSearch(query);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-24 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => runSearch(query)}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-900 dark:bg-brand-600 dark:hover:bg-brand-500 text-white"
                >
                  검색
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="p-4">
                  <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
                    {error}
                  </div>
                </div>
              )}
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">검색 중...</div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">결과가 없습니다.</div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                  {results.map((it) => (
                    <li key={itemKey(it)}>
                      <button
                        type="button"
                        onClick={() => handleSelect(it)}
                        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/40 text-left"
                      >
                        {renderItem(it)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
