import { useTranslation } from 'react-i18next';

const STYLES = {
  draft: 'bg-line/60 text-ink-muted',
  submitted: 'bg-mint text-primary-dark',
  under_review: 'bg-warning-bg text-warning',
  responded: 'bg-mint text-primary-dark',
  completed: 'bg-success-bg text-success',
  cancelled: 'bg-danger-bg text-danger',
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-control text-xs font-medium whitespace-nowrap ${
        STYLES[status] || STYLES.draft
      }`}
    >
      {t(`status.${status}`, status)}
    </span>
  );
}
