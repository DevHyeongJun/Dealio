import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastShowOptions {
  tone?: ToastTone;
  /** ms (기본 2200) */
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, opts?: ToastShowOptions) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, opts: ToastShowOptions = {}) => {
      const id = ++_id;
      const tone = opts.tone ?? 'success';
      const duration = opts.duration ?? 2200;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, { tone: 'success', duration: d }),
    error: (m, d) => show(m, { tone: 'error', duration: d }),
    info: (m, d) => show(m, { tone: 'info', duration: d }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastView key={t.id} item={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const tone = item.tone;
  const toneClass =
    tone === 'success'
      ? 'bg-gray-900 text-white dark:bg-slate-700 dark:text-gray-100 dark:ring-1 dark:ring-slate-600'
      : tone === 'error'
      ? 'bg-red-600 text-white dark:bg-red-700 dark:ring-1 dark:ring-red-500/40'
      : 'bg-slate-700 text-white dark:bg-slate-700 dark:ring-1 dark:ring-slate-600';

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto px-4 py-2.5 rounded-md shadow-lg text-sm flex items-center gap-3 max-w-sm',
        'animate-[toastIn_180ms_ease-out]',
        toneClass,
      ].join(' ')}
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
