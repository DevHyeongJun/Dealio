import { useState, type ReactNode } from 'react';

export interface YooAnCollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
  /** 우측 헤더 영역 (예: 액션 버튼). 있으면 헤더 클릭 영역과 분리되어 렌더된다. */
  rightSlot?: ReactNode;
}

export default function YooAnCollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
  rightSlot,
}: YooAnCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div
        className={`flex items-center justify-between gap-3 ${open ? 'border-b border-gray-200 dark:border-slate-700' : ''}`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 p-5 sm:p-6 flex items-center gap-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{title}</h3>
          {typeof count === 'number' && (
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{count}건</span>
          )}
        </button>
        {rightSlot && <div className="pr-5 sm:pr-6 shrink-0">{rightSlot}</div>}
      </div>
      {open && children}
    </section>
  );
}
