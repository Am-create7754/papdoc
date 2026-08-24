import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { MessageIcon, CardIcon, StarIcon, FileTextIcon } from '../layout/icons';

const STEPS = [
  { icon: MessageIcon, titleKey: 'landing.steps.step1Title', descKey: 'landing.steps.step1Desc' },
  { icon: CardIcon, titleKey: 'landing.steps.step2Title', descKey: 'landing.steps.step2Desc' },
  { icon: StarIcon, titleKey: 'landing.steps.step3Title', descKey: 'landing.steps.step3Desc' },
  { icon: FileTextIcon, titleKey: 'landing.steps.step4Title', descKey: 'landing.steps.step4Desc' },
];

export default function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal className="max-w-xl mb-10 lg:mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t('landing.steps.eyebrow')}</p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.steps.title')}
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 relative">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.titleKey} delay={i * 80} className="relative">
                <div className="relative">
                  <div className="w-12 h-12 rounded-control bg-mint flex items-center justify-center text-primary-dark">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-dark text-white text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-ink">{t(step.titleKey)}</h3>
                <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{t(step.descKey)}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%+4px)] w-[calc(100%-56px)] border-t border-dashed border-primary/25" />
                )}
              </Reveal>
            );
          })}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
