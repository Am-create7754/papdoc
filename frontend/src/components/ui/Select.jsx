import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { label, error, className = '', id, children, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={`w-full rounded-control border px-3.5 py-2.5 text-[15px] text-ink bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
          error ? 'border-danger' : 'border-line'
        }`}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-danger mt-1.5">{error}</p>}
    </div>
  );
});

export default Select;
