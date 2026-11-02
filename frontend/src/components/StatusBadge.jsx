import { useTranslation } from 'react-i18next';

// Soft tinted pill with a status dot — readable on the dark surfaces without shouting.
const STYLES = {
  draft: 'bg-line/60 text-ink-muted',
  submitted: 'bg-primary/15 text-primary-light',
  under_review: 'bg-warning/15 text-warning',
  responded: 'bg-primary/15 text-primary-light',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-danger/15 text-danger',
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        STYLES[status] || STYLES.draft
      }`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(`status.${status}`, status)}
    </span>
  );
}
