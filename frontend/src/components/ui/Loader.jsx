export function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function PageLoader({ label }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-ink-muted">
      <Spinner className="w-6 h-6 text-primary" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-control bg-line/70 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-card border border-line/70 shadow-soft p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
