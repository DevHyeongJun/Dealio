import { ReactNode, useEffect } from 'react';

export interface YooAnModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

export default function YooAnModal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: YooAnModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full ${sizeMap[size]} max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
