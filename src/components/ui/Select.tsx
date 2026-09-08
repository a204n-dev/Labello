import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-[10px] uppercase font-semibold text-text-muted mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full bg-bg-tertiary border rounded-lg px-2 py-1.5 text-xs text-text-primary
              appearance-none pr-8
              transition-colors
              ${error ? 'border-state-error-text focus:border-state-error-text focus:ring-1 focus:ring-state-error-text' : 'border-border-subtle focus:border-border-focus focus:ring-1 focus:ring-border-focus'}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-[10px] text-state-error-text" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-1 text-[10px] text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';