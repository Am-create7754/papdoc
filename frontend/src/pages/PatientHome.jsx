import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyConsultations } from '../services/consultationService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton } from '../components/ui/Loader';
import { ConsultIcon, PillIcon, UserIcon } from '../components/layout/icons';

export default function PatientHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [consultations, setConsultations] = useState(null);

  useEffect(() => {
    fetchMyConsultations()
      .then(setConsultations)
      .catch(() => setConsultations([]));
  }, []);

  const recent = consultations?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
          {t('home.patientGreeting', { name: user?.name?.split(' ')[0] || '' })}
        </h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t('home.patientSubtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6 sm:p-8 bg-primary-dark text-white border-none">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:justify-between">
            <div>
              <div className="w-11 h-11 rounded-control bg-white/15 flex items-center justify-center mb-4">
                <ConsultIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold mb-1.5">{t('home.startConsultationTitle')}</h2>
              <p className="text-white/75 text-[15px] max-w-sm">{t('home.startConsultationDesc')}</p>
            </div>
            <Link to="/patient/consultations/new" className="shrink-0">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-primary-dark hover:bg-white/90 w-full sm:w-auto"
              >
                {t('nav.startConsultation')}
              </Button>
            </Link>
          </div>
        </Card>

        <Link to="/patient/profile">
          <Card className="p-6 h-full hover:border-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-control bg-mint flex items-center justify-center mb-4 text-primary-dark">
              <UserIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-ink mb-1">{t('home.profileTitle')}</h2>
            <p className="text-ink-muted text-sm">{t('home.profileDesc')}</p>
          </Card>
        </Link>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">{t('home.recentConsultation')}</h2>
            <Link to="/patient/consultations" className="text-sm font-medium text-primary-dark hover:underline">
              {t('nav.consultations')}
            </Link>
          </div>

          {consultations === null && <CardSkeleton />}

          {consultations !== null && !recent && (
            <div className="text-center py-6">
              <p className="text-ink-muted text-sm mb-4">{t('home.noRecentConsultation')}</p>
              <Link to="/patient/consultations/new">
                <Button variant="outline">{t('home.startFirstConsultation')}</Button>
              </Link>
            </div>
          )}

          {recent && (
            <Link
              to={`/patient/consultations/${recent._id}`}
              className="flex items-start justify-between gap-3 rounded-control border border-line p-4 hover:border-primary/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{recent.chiefComplaint}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {new Date(recent.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <StatusBadge status={recent.status} />
            </Link>
          )}
        </Card>

        <Link to="/patient/prescriptions">
          <Card className="p-6 h-full hover:border-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-control bg-mint flex items-center justify-center mb-4 text-primary-dark">
              <PillIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-ink mb-1">{t('home.prescriptionsTitle')}</h2>
            <p className="text-ink-muted text-sm">{t('home.prescriptionsDesc')}</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
