import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { FileTextIcon, CheckCircleIcon } from '../layout/icons';

export default function PrescriptionSection() {
  const { t } = useTranslation();

  const points = [
    t('landing.prescription.point1'),
    t('landing.prescription.point2'),
    t('landing.prescription.point3'),
  ];

  return (
    <section id="prescriptions" className="scroll-mt-20 py-16 sm:py-20 lg:py-24 bg-surface">
      <ResponsiveContainer>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              {t('landing.prescription.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
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

          <Reveal delay={120}>
            <Card className="max-w-sm mx-auto p-6 sm:p-7">
              <div className="flex items-center gap-3 pb-4 border-b border-line">
                <div className="w-10 h-10 rounded-control bg-mint flex items-center justify-center text-primary-dark shrink-0">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{t('landing.prescription.previewDoctor')}</p>
                  <p className="text-xs text-ink-muted">{t('landing.prescription.previewAdvice')}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="h-2.5 bg-line/70 rounded-full w-full" />
                <div className="h-2.5 bg-line/70 rounded-full w-4/5" />
                <div className="h-2.5 bg-line/70 rounded-full w-3/5" />
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
          </Reveal>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
