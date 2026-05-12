import { TextareaHTMLAttributes, forwardRef } from 'react';

export type YooAnTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const base =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60';

const YooAnTextarea = forwardRef<HTMLTextAreaElement, YooAnTextareaProps>(
  ({ className = '', rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={`${base} ${className}`} {...rest} />
  ),
);
YooAnTextarea.displayName = 'YooAnTextarea';

export default YooAnTextarea;
