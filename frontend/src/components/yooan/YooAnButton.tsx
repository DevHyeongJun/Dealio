import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

export interface YooAnButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-0';

const sizeMap: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const variantMap: Record<Variant, string> = {
  primary:
    'bg-brand-600 hover:bg-brand-700 text-white shadow-sm dark:bg-brand-500 dark:hover:bg-brand-600 focus:ring-brand-500',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-600 focus:ring-brand-500',
  danger:
    'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 focus:ring-red-500',
  ghost:
    'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-slate-700 focus:ring-brand-500',
};

const YooAnButton = forwardRef<HTMLButtonElement, YooAnButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      {...rest}
    />
  ),
);
YooAnButton.displayName = 'YooAnButton';

export default YooAnButton;
