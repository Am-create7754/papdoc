import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { fetchDoctorConsultations } from '../services/consultationService';
import Card from '../components/ui/Card';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton } from '../components/ui/Loader';
import { HistoryIcon, UserIcon } from '../components/layout/icons';

export default function DoctorHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [consultations, setConsultations] = useState(null);

  useEffect(() => {
    fetchDoctorConsultations()
      .then(setConsultations)
      .catch(() => setConsultations([]));
  }, []);

  const recent = consultations?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
          {t('home.doctorGreeting', { name: user?.fullName?.split(' ').pop() || '' })}
        </h1>
        <p className="text-ink-muted mt-1 text-[15px]">{t('home.doctorSubtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Link to="/doctor/consultations">
          <Card className="p-6 h-full bg-primary-dark text-white border-none hover:opacity-95 transition-opacity">
            <div className="w-11 h-11 rounded-control bg-white/15 flex items-center justify-center mb-4">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold mb-1">{t('home.viewConsultationsTitle')}</h2>
            <p className="text-white/75 text-sm">{t('home.viewConsultationsDesc')}</p>
          </Card>
        </Link>

        <Link to="/doctor/profile">
          <Card className="p-6 h-full hover:border-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-control bg-mint flex items-center justify-center mb-4 text-primary-dark">
              <UserIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-ink mb-1">{t('home.editProfileTitle')}</h2>
            <p className="text-ink-muted text-sm">{t('home.editProfileDesc')}</p>
          </Card>
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink">{t('home.recentConsultations')}</h2>
          <Link to="/doctor/consultations" className="text-sm font-medium text-primary-dark hover:underline">
            {t('nav.consultations')}
          </Link>
        </div>

        {consultations === null && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {consultations !== null && recent.length === 0 && (
          <p className="text-ink-muted text-sm py-4 text-center">{t('home.noConsultationsYet')}</p>
        )}

        {recent.length > 0 && (
          <div className="divide-y divide-line">
            {recent.map((c) => (
              <Link
                key={c._id}
                to={`/doctor/consultations/${c._id}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-surface -mx-2 px-2 rounded-control transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{c.patientId?.name || 'Unknown patient'}</p>
                  <p className="text-xs text-ink-muted truncate">{c.chiefComplaint}</p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
