import { ReactNode } from 'react';

export interface YooAnSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  trailing?: ReactNode;
}

export default function YooAnSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = '검색',
  trailing,
}: YooAnSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={onSubmit}
          aria-label="검색"
          className="absolute inset-y-0 right-0 flex items-center justify-center w-9 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.473 9.762l3.382 3.383a.75.75 0 1 0 1.06-1.06l-3.382-3.383A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {trailing}
    </div>
  );
}
