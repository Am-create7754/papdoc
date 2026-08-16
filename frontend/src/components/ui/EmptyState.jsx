export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="bg-white rounded-card border border-line/70 shadow-soft p-10 sm:p-14 text-center">
      {icon && (
        <div className="mx-auto w-14 h-14 rounded-full bg-mint flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
      )}
      {title && <p className="font-medium text-ink mb-1.5">{title}</p>}
      {description && <p className="text-ink-muted text-[15px] max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
