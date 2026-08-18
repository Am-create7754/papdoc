import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchMyConsultations } from '../services/consultationService';
import StatusBadge from '../components/StatusBadge';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Loader';
import { HistoryIcon } from '../components/layout/icons';

export default function MyConsultations() {
  const { t } = useTranslation();
  const [consultations, setConsultations] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setConsultations(await fetchMyConsultations());
      } catch (err) {
        setError(err.response?.data?.message || t('myConsultations.loadError'));
      }
    })();
  }, [t]);

  return (
    <div>
      <PageHeader
        title={t('myConsultations.title')}
        backTo="/patient"
        backLabel={t('myConsultations.backHome')}
        actions={
          <Link to="/patient/consultations/new">
            <Button>{t('myConsultations.newButton')}</Button>
          </Link>
        }
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
          title={t('myConsultations.title')}
          description={t('myConsultations.empty')}
          action={
            <Link to="/patient/consultations/new">
              <Button>{t('home.startFirstConsultation')}</Button>
            </Link>
          }
        />
      )}

      {consultations && consultations.length > 0 && (
        <div className="space-y-3">
          {consultations.map((c) => (
            <Link key={c._id} to={`/patient/consultations/${c._id}`}>
              <Card className="p-4 sm:p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{c.chiefComplaint}</p>
                    <p className="text-xs text-ink-muted mt-1">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · <span className="capitalize">{c.consultationType}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={c.status} />
                    <PaymentStatusBadge status={c.paymentStatus} />
                  </div>
                </div>
                {c.prescriptionStatus === 'generated' && (
                  <p className="text-xs font-medium text-primary-dark mt-2">{t('prescription.available')}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
