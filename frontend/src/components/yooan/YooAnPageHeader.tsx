import { ReactNode } from 'react';

export interface YooAnPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function YooAnPageHeader({ title, description, actions }: YooAnPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
