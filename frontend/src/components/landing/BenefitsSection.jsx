import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { HomeIcon, ShieldIcon, FileTextIcon, StarIcon, HistoryIcon, GlobeIcon } from '../layout/icons';

const ITEMS = [
  { icon: HomeIcon, titleKey: 'landing.benefits.item1Title', descKey: 'landing.benefits.item1Desc' },
  { icon: ShieldIcon, titleKey: 'landing.benefits.item2Title', descKey: 'landing.benefits.item2Desc' },
  { icon: FileTextIcon, titleKey: 'landing.benefits.item3Title', descKey: 'landing.benefits.item3Desc' },
  { icon: StarIcon, titleKey: 'landing.benefits.item4Title', descKey: 'landing.benefits.item4Desc' },
  { icon: HistoryIcon, titleKey: 'landing.benefits.item5Title', descKey: 'landing.benefits.item5Desc' },
  { icon: GlobeIcon, titleKey: 'landing.benefits.item6Title', descKey: 'landing.benefits.item6Desc' },
];

export default function BenefitsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal className="max-w-xl mb-10 lg:mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t('landing.benefits.eyebrow')}
          </p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.benefits.title')}
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.titleKey} delay={i * 60}>
                <Card className="p-5 sm:p-6 h-full backdrop-blur-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_40px_-14px_rgba(0,0,0,0.6),0_0_24px_-8px_rgba(200,155,60,0.3)] transition-all duration-300">
                  <div className="w-10 h-10 rounded-control bg-mint flex items-center justify-center text-primary-dark">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink">{t(item.titleKey)}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{t(item.descKey)}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
