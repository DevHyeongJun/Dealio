import { InputHTMLAttributes, forwardRef } from 'react';
import { formatComma, parseDigits, toKoreanAmount } from '../../lib/koreanAmount';

export interface YooAnAmountInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  invalid?: boolean;
  showKorean?: boolean;
  suffix?: string;
}

const base =
  'w-full px-3 py-2 bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-md text-sm focus:outline-none focus:ring-2 disabled:opacity-60 text-right font-mono';

const YooAnAmountInput = forwardRef<HTMLInputElement, YooAnAmountInputProps>(
  ({ value, onChange, className = '', invalid, showKorean = true, suffix = '원', ...rest }, ref) => {
    const numeric = typeof value === 'number' ? value : parseDigits(String(value ?? ''));
    const display = numeric ? formatComma(numeric) : '';
    const korean = showKorean ? toKoreanAmount(numeric) : '';

    return (
      <div className="space-y-1">
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={display}
            onChange={(e) => onChange(parseDigits(e.target.value))}
            className={`${base} ${
              invalid
                ? 'border-red-400 focus:ring-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-slate-700 focus:ring-brand-500'
            } ${suffix ? 'pr-8' : ''} ${className}`}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        {showKorean && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right min-h-[1em]">
            {korean}
          </div>
        )}
      </div>
    );
  },
);
YooAnAmountInput.displayName = 'YooAnAmountInput';

export default YooAnAmountInput;
