import React, { useState, useEffect, useRef } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  hidePrefix?: boolean;
  className?: string;
  containerClassName?: string;
  prefixClassName?: string;
  selectAllOnFocus?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1000,
  prefix = '$',
  hidePrefix = false,
  className = '',
  containerClassName = '',
  prefixClassName = '',
  selectAllOnFocus = true,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder = '0',
  disabled,
  ...rest
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Math.round(value).toLocaleString('en-US');
  });

  const isFocusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize when external value changes and input is not actively being typed in
  useEffect(() => {
    const numericInDisplay = displayValue ? parseInt(displayValue.replace(/\D/g, ''), 10) : 0;
    if (value !== numericInDisplay || (!isFocusedRef.current && displayValue === '')) {
      setDisplayValue(value ? Math.round(value).toLocaleString('en-US') : '0');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const selectionStart = input.selectionStart ?? rawValue.length;

    // Count how many numeric digits were BEFORE the cursor in the typed text
    const digitsBeforeCursor = rawValue.slice(0, selectionStart).replace(/\D/g, '').length;

    // Extract pure integer digits
    const cleanDigits = rawValue.replace(/\D/g, '');

    if (cleanDigits === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    let numericVal = parseInt(cleanDigits, 10);
    if (isNaN(numericVal)) numericVal = 0;
    if (max !== undefined && numericVal > max) {
      numericVal = max;
    }

    // Format new display string with commas
    const formatted = numericVal.toLocaleString('en-US');
    setDisplayValue(formatted);
    onChange(numericVal);

    // Restore cursor position seamlessly based on digits count
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCursorPos = formatted.length;
      let digitsCounted = 0;

      if (digitsBeforeCursor === 0) {
        newCursorPos = 0;
      } else {
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            digitsCounted++;
            if (digitsCounted === digitsBeforeCursor) {
              newCursorPos = i + 1;
              break;
            }
          }
        }
      }
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intuitive backspace across commas
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd, value: currentVal } = input;
      // If cursor is right after a comma and no range is highlighted
      if (selectionStart === selectionEnd && selectionStart && selectionStart > 1) {
        if (currentVal[selectionStart - 1] === ',') {
          e.preventDefault();
          // Remove the digit before the comma
          const before = currentVal.slice(0, selectionStart - 2);
          const after = currentVal.slice(selectionStart);
          const cleanDigits = (before + after).replace(/\D/g, '');

          if (cleanDigits === '') {
            setDisplayValue('');
            onChange(0);
            return;
          }

          let num = parseInt(cleanDigits, 10);
          if (isNaN(num)) num = 0;
          if (max !== undefined && num > max) num = max;

          const formatted = num.toLocaleString('en-US');
          setDisplayValue(formatted);
          onChange(num);

          const targetDigits = before.replace(/\D/g, '').length;
          requestAnimationFrame(() => {
            if (!inputRef.current) return;
            let newCursorPos = 0;
            let counted = 0;
            if (targetDigits > 0) {
              for (let i = 0; i < formatted.length; i++) {
                if (/\d/.test(formatted[i])) {
                  counted++;
                  if (counted === targetDigits) {
                    newCursorPos = i + 1;
                    break;
                  }
                }
              }
            }
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          });
          return;
        }
      }
    }

    // Keyboard ArrowUp / ArrowDown stepping
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = (step || 1000) * (e.key === 'ArrowUp' ? 1 : -1);
      const currentNum = displayValue ? parseInt(displayValue.replace(/\D/g, ''), 10) || 0 : 0;
      let nextNum = currentNum + delta;
      if (min !== undefined) nextNum = Math.max(min, nextNum);
      if (max !== undefined) nextNum = Math.min(max, nextNum);
      const formatted = nextNum.toLocaleString('en-US');
      setDisplayValue(formatted);
      onChange(nextNum);
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    if (selectAllOnFocus) {
      e.target.select();
    }
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    let num = displayValue ? parseInt(displayValue.replace(/\D/g, ''), 10) : 0;
    if (isNaN(num)) num = 0;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;

    setDisplayValue(num.toLocaleString('en-US'));
    onChange(num);

    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {!hidePrefix && (
        <span
          className={`absolute left-2.5 top-2 text-xs text-slate-400 font-mono pointer-events-none select-none ${prefixClassName}`}
        >
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${!hidePrefix ? 'pl-6' : 'px-2.5'} pr-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:outline-none transition ${className}`}
        {...rest}
      />
    </div>
  );
};
