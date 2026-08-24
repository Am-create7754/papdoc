import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const VARIANTS = {
  primary: 'bg-primary text-primary-dark hover:bg-primary-light disabled:hover:bg-primary',
  secondary: 'bg-mint text-primary-dark hover:bg-mint/70',
  outline: 'bg-surface text-ink border border-line hover:border-primary/40 hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
};

const SIZES = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className = '', children, disabled, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      whileHover={disabled ? undefined : { scale: 1.015 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${
        VARIANTS[variant]
      } ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export default Button;
