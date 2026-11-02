import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import Logo from '../../components/landing/Logo';
import { FileTextIcon, ShieldIcon, VideoIcon } from '../../components/layout/icons';
import doctorHeroPhoto from '../../assets/images/doctor-hero.jpg';
import { VIDEO_CONSULTATIONS_LIVE } from '../../constants/features';
import { ComingSoonBadge } from '../../components/ComingSoon';

const TRUST_POINTS = [
  { key: 'video', icon: VideoIcon },
  { key: 'prescriptions', icon: FileTextIcon },
  { key: 'secure', icon: ShieldIcon },
];

// Shared shell for the login/register screens. Mirrors the landing page's look — the doctor's
// photo under a dark gold-tinted wash on the left, and the form in a raised card on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="hidden lg:flex lg:w-[44%] relative overflow-hidden border-r border-line">
        <img
          src={doctorHeroPhoto}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/85 to-canvas/30"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative flex flex-col justify-between w-full p-12 xl:p-16">
          <Link to="/" className="self-start">
            <Logo />
          </Link>

          <div>
            <h2 className="font-display font-bold text-3xl xl:text-[2.6rem] leading-tight tracking-tight text-ink max-w-md">
              {t('auth.tagline')}
            </h2>
            <p className="mt-4 text-ink-muted text-[15px] leading-relaxed max-w-sm">{t('auth.taglineDesc')}</p>

            <ul className="mt-8 space-y-3">
              {TRUST_POINTS.map(({ key, icon: Icon }) => (
                <li key={key} className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary-light">
                    <Icon className="w-4 h-4" />
                  </span>
                  {t(`auth.trust.${key}`)}
                  {key === 'video' && !VIDEO_CONSULTATIONS_LIVE && <ComingSoonBadge />}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-ink-muted/70 text-xs">© {new Date().getFullYear()} Healthify</p>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex items-center justify-between px-4 sm:px-8 py-5 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="relative flex-1 flex items-center justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            <div className="bg-surface/90 border border-line rounded-card shadow-pop p-6 sm:p-8">
              <div className="mb-7">
                <h1 className="font-display font-bold text-2xl sm:text-[1.7rem] text-ink tracking-tight">{title}</h1>
                {subtitle && <p className="text-ink-muted mt-2 text-[15px]">{subtitle}</p>}
              </div>
              {children}
            </div>

            {footer && <div className="mt-6 text-center text-[15px] text-ink-muted">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
