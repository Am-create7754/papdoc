import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMyConsultations, fetchPrescriptionBlob } from '../services/consultationService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Loader';
import { PillIcon } from '../components/layout/icons';

export default function Prescriptions() {
  const { t } = useTranslation();
  const [consultations, setConsultations] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [busyError, setBusyError] = useState('');

  const load = async () => {
    setError('');
    try {
      setConsultations(await fetchMyConsultations());
    } catch (err) {
      setError(err.response?.data?.message || t('prescriptions.loadError'));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const prescriptions = (consultations || []).filter((c) => c.prescriptionStatus === 'generated');

  const openBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const downloadBlob = (blob, consultationId) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Healthify-Prescription-${consultationId.slice(-6).toUpperCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleView = async (consultationId) => {
    setBusyError('');
    setBusy(`view-${consultationId}`);
    try {
      openBlob(await fetchPrescriptionBlob(consultationId));
    } catch (err) {
      setBusyError(err.response?.data?.message || t('prescription.loadError'));
    } finally {
      setBusy('');
    }
  };

  const handleDownload = async (consultationId) => {
    setBusyError('');
    setBusy(`download-${consultationId}`);
    try {
      downloadBlob(await fetchPrescriptionBlob(consultationId), consultationId);
    } catch (err) {
      setBusyError(err.response?.data?.message || t('prescription.loadError'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <PageHeader title={t('prescriptions.title')} backTo="/patient" backLabel={t('myConsultations.backHome')} />

      {error && (
        <Card className="p-6 text-center mb-4">
          <p className="text-sm text-danger mb-3">{error}</p>
          <Button variant="outline" onClick={load}>
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {!consultations && !error && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {consultations && prescriptions.length === 0 && (
        <EmptyState
          icon={<PillIcon className="w-6 h-6" />}
          title={t('prescriptions.title')}
          description={t('prescriptions.empty')}
        />
      )}

      {busyError && (
        <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3 mb-4">
          {busyError}
        </p>
      )}

      {prescriptions.length > 0 && (
        <div className="space-y-3">
          {prescriptions.map((c) => (
            <Card
              key={c._id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap transition-colors hover:border-primary/40"
            >
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-light to-primary text-canvas shrink-0">
                <PillIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink truncate">{c.chiefComplaint}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {c.prescriptionGeneratedAt &&
                    t('prescription.generatedOn', {
                      date: new Date(c.prescriptionGeneratedAt).toLocaleDateString(),
                    })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => handleView(c._id)}
                  disabled={!!busy}
                >
                  {busy === `view-${c._id}` ? t('common.loading') : t('prescription.view')}
                </Button>
                <Button onClick={() => handleDownload(c._id)} disabled={!!busy}>
                  {busy === `download-${c._id}` ? t('common.loading') : t('prescription.download')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
