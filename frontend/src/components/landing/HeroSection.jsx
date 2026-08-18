import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import StatusBadge from '../StatusBadge';
import PaymentStatusBadge from '../PaymentStatusBadge';
import Reveal from './Reveal';
import { CheckCircleIcon, FileTextIcon } from '../layout/icons';

export default function HeroSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-40 w-[560px] h-[560px] rounded-full bg-mint/60 blur-3xl"
      />
      <ResponsiveContainer className="relative py-14 sm:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 bg-mint text-primary-dark text-xs font-semibold px-3 py-1.5 rounded-control">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              {t('landing.hero.badge')}
            </span>
            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink tracking-tight leading-[1.15]">
              {t('landing.hero.headline')}
            </h1>
            <p className="mt-5 text-ink-muted text-[16px] sm:text-lg leading-relaxed max-w-lg">
              {t('landing.hero.subcopy')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={consultPath} className="w-full sm:w-auto">
                <Button size="lg" fullWidth className="sm:w-auto">
                  {t('landing.hero.primaryCta')}
                </Button>
              </Link>
              <a href="#doctor" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth className="sm:w-auto">
                  {t('landing.hero.secondaryCta')}
                </Button>
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2">
              {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CheckCircleIcon className="w-4 h-4 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150} className="relative">
            <div className="relative max-w-sm mx-auto lg:max-w-none mb-8 sm:mb-10">
              <Card className="p-5 sm:p-6 relative z-10">
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                  {t('landing.hero.cardComplaintLabel')}
                </p>
                <p className="text-ink font-medium mt-1">{t('landing.hero.cardComplaintValue')}</p>

                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                    {t('landing.hero.cardStatusLabel')}
                  </span>
                  <StatusBadge status="under_review" />
                </div>

                <p className="mt-4 text-xs text-ink-muted flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  {t('landing.hero.cardDoctorNote')}
                </p>
              </Card>

              <Card className="p-4 sm:p-5 absolute -bottom-8 -left-6 sm:-left-10 w-[72%] z-20 shadow-pop hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-control bg-mint flex items-center justify-center text-primary-dark shrink-0">
                    <FileTextIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
                      {t('landing.hero.cardPrescriptionLabel')}
                    </p>
                    <p className="text-sm font-medium text-ink truncate">
                      {t('landing.hero.cardPrescriptionValue')}
                    </p>
                  </div>
                  <PaymentStatusBadge status="paid" />
                </div>
              </Card>
            </div>
          </Reveal>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
