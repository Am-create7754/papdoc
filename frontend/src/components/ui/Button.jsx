import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:hover:bg-primary',
  secondary: 'bg-mint text-primary-dark hover:bg-mint/70',
  outline: 'bg-white text-ink border border-line hover:border-primary/40 hover:bg-surface',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface hover:text-ink',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${
        VARIANTS[variant]
      } ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
