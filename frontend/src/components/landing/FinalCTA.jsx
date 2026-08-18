import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';

export default function FinalCTA() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <Reveal>
          <div className="rounded-card bg-primary-dark px-6 py-12 sm:px-12 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight max-w-xl mx-auto">
              {t('landing.finalCta.title')}
            </h2>
            <p className="mt-3 text-white/80 text-[15px] sm:text-base max-w-md mx-auto">
              {t('landing.finalCta.subtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={consultPath} className="w-full sm:w-auto">
                <Button size="lg" fullWidth className="sm:w-auto bg-white text-primary-dark hover:bg-white/90">
                  {t('landing.finalCta.primaryCta')}
                </Button>
              </Link>
              <Link to="/login/patient" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  className="sm:w-auto border-white/40 text-white hover:bg-white/10"
                >
                  {t('landing.finalCta.secondaryCta')}
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </ResponsiveContainer>
    </section>
  );
}
