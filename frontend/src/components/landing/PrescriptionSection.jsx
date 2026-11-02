import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import FloatOnClick from './FloatOnClick';
import { FileTextIcon, CheckCircleIcon } from '../layout/icons';
import FloatingMotif from './decor/FloatingMotif';
import { TabletMotif, MedicalCrossMotif } from './decor/MedicalMotifIcons';
import { fetchPublicDoctorProfile } from '../../services/doctorService';

// Illustrative medicine rows: bar widths stand in for drug names, chips show how a dose schedule
// (morning-noon-night) and duration read on a real Healthify prescription.
const PREVIEW_ROWS = [
  { width: 'w-28', dose: '1-0-1', days: 5 },
  { width: 'w-20', dose: '0-0-1', days: 7 },
  { width: 'w-24', dose: '1-1-1', days: 3 },
];

export default function PrescriptionSection() {
  const { t } = useTranslation();
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    fetchPublicDoctorProfile().then(setDoctor).catch(() => {});
  }, []);

  const points = [
    t('landing.prescription.point1'),
    t('landing.prescription.point2'),
    t('landing.prescription.point3'),
  ];

  return (
    <section id="prescriptions" className="relative scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <FloatingMotif
        icon={TabletMotif}
        className="hidden sm:block top-4 left-[4%]"
        size="w-7 h-7"
        tone="text-primary/20"
        duration={10}
        driftY={11}
      />
      <FloatingMotif
        icon={MedicalCrossMotif}
        className="hidden lg:block bottom-10 right-[6%]"
        size="w-8 h-8"
        tone="text-primary-light/20"
        duration={12}
        delay={500}
      />
      <ResponsiveContainer>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              {t('landing.prescription.eyebrow')}
            </p>
            <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              {t('landing.prescription.title')}
            </h2>
            <p className="mt-3 text-ink-muted text-[15px] leading-relaxed max-w-md">
              {t('landing.prescription.desc')}
            </p>

            <ul className="mt-6 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-ink">
                  <CheckCircleIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
          >
            <FloatOnClick>
              <Card className="max-w-sm mx-auto p-6 sm:p-7 ring-1 ring-primary/10">
                <div className="flex items-center gap-3 pb-4 border-b border-line">
                  <div className="w-10 h-10 rounded-control bg-mint flex items-center justify-center text-primary-dark shrink-0">
                    <FileTextIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {doctor?.fullName || t('landing.prescription.previewDoctor')}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {[doctor?.qualifications?.join(', '), doctor?.clinicName].filter(Boolean).join(' · ') ||
                        t('landing.prescription.previewAdvice')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="font-quote italic text-3xl leading-none text-primary-light" aria-hidden="true">
                    ℞
                  </span>
                  <ul className="flex-1 space-y-2.5 pt-1">
                    {PREVIEW_ROWS.map((row) => (
                      <li key={row.dose + row.days} className="flex items-center justify-between gap-2">
                        <span className={`h-2.5 ${row.width} bg-line rounded-full`} />
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full bg-primary/15 text-primary-light text-[10px] font-semibold px-2 py-0.5">
                            {row.dose}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {t('landing.prescription.previewDays', { count: row.days })}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                    {t('landing.prescription.previewSigned')}
                  </span>
                  <svg viewBox="0 0 90 30" className="w-20 h-7 text-primary-light" aria-hidden="true">
                    <path
                      d="M4 22c6-10 10-14 13-10s-3 12 2 9 8-16 12-14-2 14 3 12 6-9 9-8 1 8 5 7 8-6 12-5 8 3 16-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-primary-dark bg-mint rounded-control py-2.5 cursor-default"
                >
                  <FileTextIcon className="w-4 h-4" />
                  {t('landing.prescription.previewDownload')}
                </button>
              </Card>
            </FloatOnClick>
          </motion.div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
