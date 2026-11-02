import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { fetchPublicDoctorProfile } from '../../services/doctorService';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import FloatOnClick from './FloatOnClick';
import { CardSkeleton } from '../ui/Loader';
import { CheckCircleIcon, ClockIcon, FileTextIcon, MapPinIcon, MessageIcon, ShieldIcon, VideoIcon } from '../layout/icons';
import { CLINIC_DIRECTIONS_URL, CLINIC_PHONES, formatPhone } from '../../constants/clinic';
import { VIDEO_CONSULTATIONS_LIVE } from '../../constants/features';
import { ComingSoonBadge } from '../ComingSoon';
import FloatingMotif from './decor/FloatingMotif';
import { StethoscopeMotif } from './decor/MedicalMotifIcons';
import RodOfAsclepius from './RodOfAsclepius';

function initials(name) {
  const cleaned = (name || '').trim().replace(/^dr\.?\s+/i, '');
  return (cleaned[0] || 'H').toUpperCase();
}

const ASSURANCES = [
  { key: 'assurePersonal', icon: CheckCircleIcon },
  { key: 'assurePrescription', icon: FileTextIcon },
  { key: 'assurePrivate', icon: ShieldIcon },
];

function formatFee(fee) {
  return `₹${Number(fee).toLocaleString('en-IN')}`;
}

// Right-hand column of the doctor card: quick facts, how you can consult (with real fees from the
// doctor's profile) and the physical clinic — so the card reads as complete rather than half-empty.
function DoctorFactsPanel({ doctor }) {
  const { t } = useTranslation();

  const options = [
    doctor.consultationFee > 0 && {
      key: 'standard',
      icon: MessageIcon,
      label: t('consultation.typeStandard'),
      desc: t('landing.doctor.standardDesc'),
      fee: doctor.consultationFee,
    },
    doctor.priorityConsultationFee > 0 && {
      key: 'priority',
      icon: ClockIcon,
      label: t('consultation.typePriority'),
      desc: t('landing.doctor.priorityDesc'),
      fee: doctor.priorityConsultationFee,
    },
    doctor.videoConsultationEnabled &&
      doctor.videoConsultationFee > 0 && {
        key: 'video',
        icon: VideoIcon,
        label: t('consultation.typeVideo'),
        desc: t('landing.doctor.videoDesc'),
        fee: doctor.videoConsultationFee,
        comingSoon: !VIDEO_CONSULTATIONS_LIVE,
      },
  ].filter(Boolean);

  const facts = [
    doctor.yearsOfExperience != null && { value: `${doctor.yearsOfExperience}+`, label: t('landing.doctor.factYears') },
    doctor.languages?.length > 0 && { value: doctor.languages.length, label: t('landing.doctor.factLanguages') },
    options.length > 0 && {
      value: options.filter((o) => !o.comingSoon).length,
      label: t('landing.doctor.factWays'),
    },
  ].filter(Boolean);

  return (
    <aside className="md:col-span-2 lg:col-span-1 flex flex-col gap-4 lg:border-l lg:border-line lg:pl-8">
      {facts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-control bg-primary/10 border border-primary/20 px-2 py-3 text-center">
              <p className="font-display font-bold text-2xl text-primary-light leading-none">{fact.value}</p>
              <p className="mt-1.5 text-[11px] leading-tight text-ink-muted">{fact.label}</p>
            </div>
          ))}
        </div>
      )}

      {options.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            {t('landing.doctor.optionsLabel')}
          </p>
          <ul className="divide-y divide-line rounded-control border border-line bg-surface/60">
            {options.map(({ key, icon: Icon, label, desc, fee, comingSoon }) => (
              <li key={key} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary-light shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{label}</p>
                  <p className="text-[11px] text-ink-muted truncate">{desc}</p>
                </div>
                {comingSoon ? (
                  <ComingSoonBadge className="shrink-0" />
                ) : (
                  <span className="text-sm font-semibold text-primary-light shrink-0">{formatFee(fee)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-control border border-line bg-surface/60 p-3.5">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{t('landing.doctor.visitLabel')}</p>
        <p className="mt-1.5 text-sm text-ink leading-snug">{doctor.clinicAddress || doctor.city || doctor.clinicName}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <a
            href={CLINIC_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-primary-light hover:text-primary transition-colors"
          >
            <MapPinIcon className="w-4 h-4" />
            {t('landing.doctor.directions')}
          </a>
          <a
            href={`tel:+91${CLINIC_PHONES[0]}`}
            className="text-ink-muted hover:text-primary transition-colors"
          >
            {formatPhone(CLINIC_PHONES[0])}
          </a>
        </div>
      </div>
    </aside>
  );
}

export default function DoctorTrustSection() {
  const { t } = useTranslation();
  const [doctor, setDoctor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicDoctorProfile()
      .then((data) => {
        setDoctor(data);
        setError('');
      })
      .catch(() => setError(t('landing.doctor.loadError')));
  }, [t]);

  return (
    <section id="doctor" className="relative scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <FloatingMotif
        icon={StethoscopeMotif}
        className="hidden lg:block top-6 right-[5%]"
        size="w-9 h-9"
        tone="text-primary/20"
        duration={12}
      />
      <FloatingMotif
        icon={RodOfAsclepius}
        className="hidden sm:block bottom-2 left-[2%]"
        size="w-6 h-16"
        tone="text-primary-light/15"
        duration={14}
        delay={300}
        driftY={8}
        rotate={2}
      />
      <ResponsiveContainer>
        <Reveal className="max-w-2xl mb-8 lg:mb-10">
          <svg viewBox="0 0 54 40" className="w-11 h-8 text-primary-light opacity-90" fill="currentColor" aria-hidden="true">
            <path d="M0 40V22.9C0 9.2 8 1.2 20.6 0l1.8 5.8c-7 1.6-10.8 6-10.8 12.4h10.8V40H0zm28.6 0V22.9C28.6 9.2 36.6 1.2 49.2 0L51 5.8c-7 1.6-10.8 6-10.8 12.4H51V40H28.6z" />
          </svg>
          <p className="mt-3 font-quote italic text-2xl sm:text-3xl leading-[1.4] text-ink text-balance">
            {t('landing.doctor.voiceQuote')}
          </p>
        </Reveal>

        <Reveal className="max-w-xl mb-1">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t('landing.doctor.eyebrow')}</p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.doctor.title')}
          </h2>
        </Reveal>
        <Reveal delay={90} className="max-w-xl mb-10 lg:mb-14">
          <p className="mt-3 text-ink-muted text-[15px] leading-relaxed">{t('landing.doctor.subtitle')}</p>
        </Reveal>

        {error && <p className="text-danger text-sm">{error}</p>}

        {!doctor && !error && (
          <div className="max-w-3xl">
            <CardSkeleton />
          </div>
        )}

        {doctor && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          >
            {/* Deliberately a darker, richer island than the surrounding surface-wash cards
                elsewhere on the page — the doctor is the one thing on this page that should
                never blend in. */}
            <Card className="p-6 sm:p-8 lg:p-10 bg-canvas/70 border-primary/20">
              <div className="grid md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_minmax(280px,320px)] gap-6 md:gap-10 lg:gap-8">
                <div className="flex md:block items-center gap-4">
                  <FloatOnClick rounded="rounded-2xl" className="shrink-0">
                    {doctor.profilePhoto ? (
                      <img
                        src={doctor.profilePhoto}
                        alt={doctor.fullName}
                        className="w-20 h-20 md:w-32 md:h-32 rounded-2xl object-cover border border-line block"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-32 md:h-32 rounded-2xl bg-mint flex items-center justify-center text-primary-dark text-3xl md:text-5xl font-semibold border border-primary/15">
                        {initials(doctor.fullName)}
                      </div>
                    )}
                  </FloatOnClick>
                  <div className="md:hidden">
                    <h3 className="font-display font-bold text-lg text-ink">{doctor.fullName}</h3>
                    {doctor.specialization && <p className="text-sm text-ink-muted">{doctor.specialization}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="hidden md:block font-display font-bold text-xl text-ink">{doctor.fullName}</h3>
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

                  <ul className="mt-6 pt-5 border-t border-line grid sm:grid-cols-3 gap-3">
                    {ASSURANCES.map(({ key, icon: Icon }) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm text-ink">
                        <Icon className="w-4 h-4 text-primary-light shrink-0 mt-0.5" />
                        <span className="leading-snug">{t(`landing.doctor.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <DoctorFactsPanel doctor={doctor} />
              </div>
            </Card>
          </motion.div>
        )}
      </ResponsiveContainer>
    </section>
  );
}
