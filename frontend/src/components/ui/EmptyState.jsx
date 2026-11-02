export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="relative overflow-hidden bg-surface/80 rounded-card border border-line/70 shadow-soft p-10 sm:p-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-72 h-40 rounded-full bg-primary/15 blur-3xl"
      />
      {icon && (
        <div className="relative mx-auto w-16 h-16 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-5 text-primary-light">
          {icon}
        </div>
      )}
      {title && <p className="relative font-display font-bold text-lg text-ink mb-1.5">{title}</p>}
      {description && <p className="relative text-ink-muted text-[15px] max-w-sm mx-auto">{description}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
