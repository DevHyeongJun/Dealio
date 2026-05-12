import type { ReactNode } from 'react';

export type YooAnSummaryCardTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'amber';

export interface YooAnSummaryCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: YooAnSummaryCardTone;
  emphasis?: boolean;
}

const TONE_CLASSES: Record<YooAnSummaryCardTone, string> = {
  neutral: 'text-gray-900 dark:text-gray-100',
  brand: 'text-brand-700 dark:text-brand-300',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-yellow-700 dark:text-yellow-300',
  danger: 'text-red-700 dark:text-red-300',
  amber: 'text-amber-700 dark:text-amber-300',
};

export default function YooAnSummaryCard({
  label,
  value,
  hint,
  tone = 'neutral',
  emphasis = false,
}: YooAnSummaryCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 font-bold ${emphasis ? 'text-xl' : 'text-lg'} ${TONE_CLASSES[tone]} truncate`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
    </div>
  );
}
