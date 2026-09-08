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
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-mode-utau hover:bg-mode-utau/90 active:bg-mode-utau text-white shadow-sm shadow-mode-utau/20',
      secondary: 'bg-bg-tertiary hover:bg-bg-hover text-text-secondary border border-border-subtle',
      ghost: 'bg-transparent hover:bg-bg-tertiary text-text-secondary',
      danger: 'bg-state-error-text/10 hover:bg-state-error-text/20 text-state-error-text border border-state-error-border/30',
      success: 'bg-state-success-bg/20 hover:bg-state-success-bg/30 text-state-success-text border border-state-success-border/30',
    };

    const sizes = {
      sm: 'px-2 py-1 text-[10px] gap-1',
      md: 'px-3 py-1.5 text-xs gap-1.5',
      lg: 'px-4 py-2 text-sm gap-2',
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