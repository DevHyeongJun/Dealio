import { InputHTMLAttributes, forwardRef } from 'react';

export interface YooAnInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const base =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 disabled:opacity-60';

const YooAnInput = forwardRef<HTMLInputElement, YooAnInputProps>(
  ({ className = '', invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={`${base} ${
        invalid
          ? 'border-red-400 focus:ring-red-500 dark:border-red-500'
          : 'border-gray-300 dark:border-slate-700 focus:ring-brand-500'
      } ${className}`}
      {...rest}
    />
  ),
);
YooAnInput.displayName = 'YooAnInput';

export default YooAnInput;
