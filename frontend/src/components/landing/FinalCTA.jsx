import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';

// The one deliberate glow on the page, matching the approved prototype exactly — everywhere
// else, background is owned by Landing.jsx, not by individual sections.
export default function FinalCTA() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  return (
    <section className="relative py-24 sm:py-28 lg:py-32 text-center overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[320px] rounded-full bg-primary/[0.18] blur-3xl"
      />
      <ResponsiveContainer className="relative">
        <Reveal>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.9rem] text-ink max-w-lg mx-auto tracking-tight">
            {t('landing.finalCta.title')}
          </h2>
          <p className="mt-4 text-ink-muted max-w-md mx-auto">{t('landing.finalCta.subtitle')}</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={consultPath} className="w-full sm:w-auto">
              <Button size="lg" fullWidth className="sm:w-auto">
                {t('landing.finalCta.primaryCta')}
              </Button>
            </Link>
            <Link to="/login/patient" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                className="sm:w-auto bg-transparent border-primary/35 text-primary-light hover:bg-primary/10"
              >
                {t('landing.finalCta.secondaryCta')}
              </Button>
            </Link>
          </div>
        </Reveal>
      </ResponsiveContainer>
    </section>
  );
}
