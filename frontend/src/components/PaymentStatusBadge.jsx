import { useTranslation } from 'react-i18next';

const STYLES = {
  unpaid: 'bg-line/60 text-ink-muted',
  pending: 'bg-warning-bg text-warning',
  paid: 'bg-success-bg text-success',
  failed: 'bg-danger-bg text-danger',
  refunded: 'bg-line/60 text-ink-muted',
};

export default function PaymentStatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-control text-xs font-medium whitespace-nowrap ${
        STYLES[status] || STYLES.unpaid
      }`}
    >
      {t(`payment.status.${status}`, status)}
    </span>
  );
}
