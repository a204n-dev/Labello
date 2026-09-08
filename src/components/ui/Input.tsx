import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconPosition = 'left', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[10px] uppercase font-semibold text-text-muted mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-bg-tertiary border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted
              transition-colors
              ${error ? 'border-state-error-text focus:border-state-error-text focus:ring-1 focus:ring-state-error-text' : 'border-border-subtle focus:border-border-focus focus:ring-1 focus:ring-border-focus'}
              ${iconPosition === 'left' ? 'pl-9' : 'pl-3'}
              ${iconPosition === 'right' ? 'pr-9' : 'pr-3'}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-[10px] text-state-error-text" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-[10px] text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';