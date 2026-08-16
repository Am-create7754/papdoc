import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchDoctorConsultations } from '../services/consultationService';
import StatusBadge from '../components/StatusBadge';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Loader';
import { HistoryIcon } from '../components/layout/icons';

export default function DoctorConsultations() {
  const { t } = useTranslation();
  const [consultations, setConsultations] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setConsultations(await fetchDoctorConsultations());
      } catch (err) {
        setError(err.response?.data?.message || t('doctorConsultations.loadError'));
      }
    })();
  }, [t]);

  return (
    <div>
      <PageHeader
        title={t('doctorConsultations.title')}
        backTo="/doctor"
        backLabel={t('doctorConsultations.backHome')}
      />

      {error && (
        <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">{error}</p>
      )}

      {!consultations && !error && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {consultations && consultations.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="w-6 h-6" />}
          title={t('doctorConsultations.title')}
          description={t('doctorConsultations.empty')}
        />
      )}

      {consultations && consultations.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {consultations.map((c) => (
            <Link
              key={c._id}
              to={`/doctor/consultations/${c._id}`}
              className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-surface transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{c.patientId?.name || 'Unknown patient'}</p>
                <p className="text-sm text-ink-muted truncate mt-0.5">{c.chiefComplaint}</p>
                <p className="text-xs text-ink-muted/80 mt-1">
                  {new Date(c.createdAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · <span className="capitalize">{c.consultationType}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={c.status} />
                <PaymentStatusBadge status={c.paymentStatus} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
