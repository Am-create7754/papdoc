import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import FloatingMotif from './decor/FloatingMotif';
import { MoleculeMotif } from './decor/MedicalMotifIcons';
import { CLINIC_DIRECTIONS_URL, CLINIC_MAP_EMBED_URL } from '../../constants/clinic';

// The one deliberate glow on the page, matching the approved prototype exactly — everywhere
// else, background is owned by Landing.jsx, not by individual sections.
export default function FinalCTA() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 sm:py-28 lg:py-32 text-center overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[320px] rounded-full bg-primary/[0.18] blur-3xl"
      />
      <FloatingMotif
        icon={MoleculeMotif}
        className="hidden lg:block top-10 left-[8%]"
        size="w-8 h-8"
        tone="text-primary-light/15"
        duration={13}
        driftY={10}
      />
      <ResponsiveContainer className="relative">
        <Reveal>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.9rem] text-ink max-w-lg mx-auto tracking-tight">
            {t('landing.finalCta.title')}
          </h2>
          <p className="mt-4 text-ink-muted max-w-md mx-auto">{t('landing.finalCta.subtitle')}</p>
          <div className="mt-9 max-w-3xl mx-auto overflow-hidden rounded-card border border-primary/25 shadow-soft">
            <iframe
              title={t('landing.finalCta.mapTitle')}
              src={CLINIC_MAP_EMBED_URL}
              className="block w-full h-72 sm:h-96 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <a
            href={CLINIC_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-primary-light hover:underline underline-offset-4 transition-colors"
          >
            {t('landing.finalCta.openInMaps')}
          </a>
        </Reveal>
      </ResponsiveContainer>
    </section>
  );
}
