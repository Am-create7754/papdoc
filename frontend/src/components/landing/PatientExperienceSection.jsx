import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import StatusBadge from '../StatusBadge';
import PaymentStatusBadge from '../PaymentStatusBadge';
import { CheckCircleIcon } from '../layout/icons';

export default function PatientExperienceSection() {
  const { t } = useTranslation();

  const timeline = [
    { label: t('landing.experience.step1'), done: true },
    { label: t('landing.experience.step2'), done: true },
    { label: t('landing.experience.step3'), done: true },
    { label: t('landing.experience.step4'), done: true },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal className="max-w-xl mb-1">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t('landing.experience.eyebrow')}
          </p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.experience.title')}
          </h2>
        </Reveal>
        <Reveal delay={90} className="max-w-xl mb-10 lg:mb-14">
          <p className="text-ink-muted text-[15px] leading-relaxed">{t('landing.experience.subtitle')}</p>
        </Reveal>

        <Reveal delay={100}>
          <Card className="max-w-2xl mx-auto p-0 overflow-hidden">
            <div className="bg-surface border-b border-line px-5 sm:px-7 py-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
              <span className="w-2.5 h-2.5 rounded-full bg-line" />
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <h3 className="font-semibold text-ink">{t('consultationDetail.consultationSection')}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status="completed" />
                  <PaymentStatusBadge status="paid" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    {t('consultationDetail.chiefComplaint')}
                  </p>
                  <p className="text-sm text-ink">{t('landing.hero.cardComplaintValue')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    {t('consultationDetail.symptoms')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-mint text-primary-dark text-xs px-2.5 py-1 rounded-control">Fever</span>
                    <span className="bg-mint text-primary-dark text-xs px-2.5 py-1 rounded-control">Body ache</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-line pt-5">
                {timeline.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 text-sm">
                    <CheckCircleIcon className="w-4 h-4 text-success shrink-0" />
                    <span className="text-ink">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <p className="text-center text-xs text-ink-muted mt-4">{t('landing.experience.note')}</p>
        </Reveal>
      </ResponsiveContainer>
    </section>
  );
}
