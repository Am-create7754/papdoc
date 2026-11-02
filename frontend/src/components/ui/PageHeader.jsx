import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from '../layout/icons';

// Title row with an optional round back button beside it (as in the reference app's
// "‹ My Appointments" headers) and optional actions on the right.
export default function PageHeader({ title, subtitle, backTo, backLabel, actions, eyebrow }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link
            to={backTo}
            aria-label={backLabel}
            title={backLabel}
            className="flex items-center justify-center w-11 h-11 rounded-full border border-line/80 bg-surface/80 text-ink shrink-0 transition-colors hover:border-primary/50 hover:text-primary-light"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">{eyebrow}</p>}
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-ink-muted mt-1 text-[15px]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
