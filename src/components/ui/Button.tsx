import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, iconPosition = 'left', className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex min-h-8 items-center justify-center font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-mode-utau hover:brightness-110 active:brightness-95 text-white border border-transparent',
      secondary: 'bg-bg-tertiary hover:bg-bg-hover active:bg-bg-elevated text-text-primary border border-border-default',
      ghost: 'bg-transparent hover:bg-bg-hover active:bg-bg-elevated text-text-secondary',
      danger: 'bg-transparent hover:bg-state-error-bg text-state-error-text border border-border-default',
      success: 'bg-transparent hover:bg-state-success-bg text-state-success-text border border-border-default',
    };

    const sizes = {
      sm: 'min-h-7 px-2 text-xs gap-1',
      md: 'px-3 text-xs gap-1.5',
      lg: 'min-h-9 px-4 text-sm gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {icon && iconPosition === 'right' && !loading && <span className="flex-shrink-0 ml-1">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';