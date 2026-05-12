import { useTabs, getSectionLabel } from '../contexts/TabsContext';

export default function PageTabs() {
  const { tabs, activeKey, switchTo, closeTab } = useTabs();

  if (tabs.length === 0) return null;

  const canClose = tabs.length > 1;

  return (
    <nav
      aria-label="열린 페이지 탭"
      className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            role="button"
            tabIndex={0}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => switchTo(tab.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchTo(tab.key);
              }
            }}
            className={[
              'group inline-flex items-center gap-1 h-8 rounded-full text-sm font-medium select-none transition-all cursor-pointer max-w-[180px] shrink-0',
              canClose ? 'pl-3.5 pr-1.5' : 'px-3.5',
              isActive
                ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
            ].join(' ')}
            title={getSectionLabel(tab.key)}
          >
            <span className="truncate">{getSectionLabel(tab.key)}</span>
            {canClose && (
              <button
                type="button"
                aria-label={`${getSectionLabel(tab.key)} 탭 닫기`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.key);
                }}
                className={[
                  'shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors',
                  isActive
                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-300/70 dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-slate-600',
                ].join(' ')}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
