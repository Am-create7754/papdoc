import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import HealthTipCard, { HEALTH_TIPS } from '../health/HealthTipCard';

export default function HealthTipsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8 lg:mb-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t('tips.eyebrow')}</p>
            <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">{t('tips.title')}</h2>
          </div>
          <p className="text-xs text-ink-muted max-w-xs sm:text-right">{t('tips.disclaimer')}</p>
        </Reveal>

        {/* Phones: a swipeable row. From `sm` up: the same grid as before. */}
        <div className="-mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 sm:overflow-visible">
          {HEALTH_TIPS.map((tip, i) => (
            <Reveal key={tip.key} delay={i * 60} className="h-full snap-start shrink-0 w-[78%] sm:w-auto">
              <HealthTipCard tip={tip} index={i} />
            </Reveal>
          ))}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
