import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPublicDoctorProfile } from '../../services/doctorService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { CardSkeleton } from '../ui/Loader';
import { MapPinIcon } from '../layout/icons';

function initials(name) {
  const cleaned = (name || '').trim().replace(/^dr\.?\s+/i, '');
  return (cleaned[0] || 'H').toUpperCase();
}

export default function DoctorTrustSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [error, setError] = useState('');
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  useEffect(() => {
    fetchPublicDoctorProfile()
      .then(setDoctor)
      .catch(() => setError(t('landing.doctor.loadError')));
  }, [t]);

  return (
    <section id="doctor" className="scroll-mt-20 py-16 sm:py-20 lg:py-24 bg-surface">
      <ResponsiveContainer>
        <Reveal className="max-w-xl mb-10 lg:mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t('landing.doctor.eyebrow')}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
            {t('landing.doctor.title')}
          </h2>
          <p className="mt-3 text-ink-muted text-[15px] leading-relaxed">{t('landing.doctor.subtitle')}</p>
        </Reveal>

        {error && <p className="text-danger text-sm">{error}</p>}

        {!doctor && !error && (
          <div className="max-w-3xl">
            <CardSkeleton />
          </div>
        )}

        {doctor && (
          <Reveal delay={100}>
            <Card className="p-6 sm:p-8 lg:p-10">
              <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-10">
                <div className="flex md:block items-center gap-4">
                  {doctor.profilePhoto ? (
                    <img
                      src={doctor.profilePhoto}
                      alt={doctor.fullName}
                      className="w-20 h-20 md:w-32 md:h-32 rounded-2xl object-cover border border-line"
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-2xl bg-mint flex items-center justify-center text-primary-dark text-3xl md:text-5xl font-semibold border border-primary/15">
                      {initials(doctor.fullName)}
                    </div>
                  )}
                  <div className="md:hidden">
                    <h3 className="text-lg font-semibold text-ink">{doctor.fullName}</h3>
                    {doctor.specialization && <p className="text-sm text-ink-muted">{doctor.specialization}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="hidden md:block text-xl font-semibold text-ink">{doctor.fullName}</h3>
                  {doctor.specialization && (
                    <p className="hidden md:block text-ink-muted mt-0.5">{doctor.specialization}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                    {doctor.qualifications?.length > 0 && <span>{doctor.qualifications.join(', ')}</span>}
                    {doctor.yearsOfExperience != null && (
                      <span>
                        {doctor.yearsOfExperience} {t('landing.doctor.experienceSuffix')}
                      </span>
                    )}
                    {doctor.medicalRegistrationNumber && (
                      <span>
                        {t('landing.doctor.regLabel')}: {doctor.medicalRegistrationNumber}
                      </span>
                    )}
                  </div>

                  {(doctor.clinicName || doctor.clinicAddress || doctor.city) && (
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-ink">
                      <MapPinIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        {[doctor.clinicName, doctor.clinicAddress || doctor.city].filter(Boolean).join(' — ')}
                      </span>
                    </p>
                  )}

                  {doctor.bio && <p className="mt-4 text-sm text-ink-muted leading-relaxed">{doctor.bio}</p>}

                  {doctor.languages?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
                        {t('landing.doctor.languagesLabel')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.languages.map((l) => (
                          <span key={l} className="bg-surface border border-line text-ink text-xs px-2.5 py-1 rounded-control">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {doctor.areasOfExpertise?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1.5">
                        {t('landing.doctor.expertiseLabel')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.areasOfExpertise.map((a) => (
                          <span key={a} className="bg-mint text-primary-dark text-xs px-2.5 py-1 rounded-control">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link to={consultPath} className="inline-block mt-6">
                    <Button size="lg">{t('landing.doctor.cta')}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        )}
      </ResponsiveContainer>
    </section>
  );
}
