import { ReactNode } from 'react';

type Tone = 'error' | 'info' | 'success';

export interface YooAnAlertProps {
  tone?: Tone;
  children: ReactNode;
}

const toneMap: Record<Tone, string> = {
  error: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  info: 'bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-300',
  success: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
};

export default function YooAnAlert({ tone = 'error', children }: YooAnAlertProps) {
  return (
    <div className={`rounded-md px-4 py-3 text-sm ${toneMap[tone]}`}>{children}</div>
  );
}
