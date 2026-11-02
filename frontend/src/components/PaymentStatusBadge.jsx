import { useTranslation } from 'react-i18next';

const STYLES = {
  unpaid: 'bg-line/60 text-ink-muted',
  pending: 'bg-warning/15 text-warning',
  paid: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  refunded: 'bg-line/60 text-ink-muted',
};

export default function PaymentStatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        STYLES[status] || STYLES.unpaid
      }`}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
      {t(`payment.status.${status}`, status)}
    </span>
  );
}
