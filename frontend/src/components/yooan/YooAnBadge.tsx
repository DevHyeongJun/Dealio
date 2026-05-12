import { ReactNode } from 'react';

type Tone = 'success' | 'neutral' | 'warning' | 'danger' | 'info';

export interface YooAnBadgeProps {
  tone?: Tone;
  children: ReactNode;
}

const toneMap: Record<Tone, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  neutral: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-brand-50 text-brand-700 dark:bg-slate-700 dark:text-brand-300',
};

export default function YooAnBadge({ tone = 'neutral', children }: YooAnBadgeProps) {
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
