import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, backTo, backLabel, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark mb-1"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-ink-muted mt-1 text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
