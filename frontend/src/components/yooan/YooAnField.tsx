import { ReactNode } from 'react';

export interface YooAnFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

export default function YooAnField({ label, required, hint, error, children }: YooAnFieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
