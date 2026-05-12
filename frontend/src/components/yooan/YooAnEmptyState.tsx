import { ReactNode } from 'react';

export interface YooAnEmptyStateProps {
  message: string;
  action?: ReactNode;
}

export default function YooAnEmptyState({ message, action }: YooAnEmptyStateProps) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
