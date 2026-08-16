import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, hint, className = '', id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-control border px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted/70 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
          error ? 'border-danger' : 'border-line'
        }`}
        aria-invalid={!!error}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
      {error && <p className="text-sm text-danger mt-1.5">{error}</p>}
    </div>
  );
});

export default Input;
