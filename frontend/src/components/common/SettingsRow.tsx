import type { ReactNode } from 'react';

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export default function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
