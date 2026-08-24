import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { LockIcon, ShieldIcon, FileTextIcon, UserIcon } from '../layout/icons';

const ITEMS = [
  { icon: LockIcon, titleKey: 'landing.security.item1Title', descKey: 'landing.security.item1Desc' },
  { icon: ShieldIcon, titleKey: 'landing.security.item2Title', descKey: 'landing.security.item2Desc' },
  { icon: FileTextIcon, titleKey: 'landing.security.item3Title', descKey: 'landing.security.item3Desc' },
  { icon: UserIcon, titleKey: 'landing.security.item4Title', descKey: 'landing.security.item4Desc' },
];

export default function SecuritySection() {
  const { t } = useTranslation();

  return (
    <section id="security" className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal className="max-w-xl mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t('landing.security.eyebrow')}
          </p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.security.title')}
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.titleKey} delay={i * 60}>
                <Icon className="w-5 h-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold text-ink">{t(item.titleKey)}</h3>
                <p className="mt-1 text-sm text-ink-muted leading-relaxed">{t(item.descKey)}</p>
              </Reveal>
            );
          })}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
