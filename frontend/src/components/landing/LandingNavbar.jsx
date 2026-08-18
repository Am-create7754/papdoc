import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import { MenuIcon, CloseIcon } from '../layout/icons';

const LINKS = [
  { href: '#how-it-works', key: 'landing.nav.howItWorks' },
  { href: '#doctor', key: 'landing.nav.doctor' },
  { href: '#prescriptions', key: 'landing.nav.prescriptions' },
  { href: '#security', key: 'landing.nav.security' },
];

export default function LandingNavbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dashboardPath = user?.role === 'doctor' ? '/doctor' : '/patient';
  const consultPath = isAuthenticated ? '/patient/consultations/new' : '/register/patient';

  return (
    <header
      className={`sticky top-0 z-40 bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-soft' : ''
      }`}
    >
      <ResponsiveContainer className="flex items-center justify-between h-16 sm:h-[72px]">
        <Link to="/" className="text-lg font-semibold text-primary-dark tracking-tight shrink-0">
          {t('app.name')}
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3.5 py-2 rounded-control text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Link to={dashboardPath}>
              <Button size="sm">{t('landing.nav.dashboard')}</Button>
            </Link>
          ) : (
            <>
              <Link to="/login/patient" className="text-sm font-medium text-ink-muted hover:text-ink px-2">
                {t('landing.nav.login')}
              </Link>
              <Link to={consultPath}>
                <Button size="sm">{t('landing.nav.startConsultation')}</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-control text-ink hover:bg-surface"
        >
          {open ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </ResponsiveContainer>

      {open && (
        <div className="lg:hidden border-t border-line bg-white">
          <ResponsiveContainer className="py-4 flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3.5 py-3 rounded-control text-[15px] font-medium text-ink hover:bg-surface"
              >
                {t(link.key)}
              </a>
            ))}
            <div className="flex items-center justify-between px-3.5 py-3">
              <span className="text-sm text-ink-muted">{t('language.label')}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <Button fullWidth>{t('landing.nav.dashboard')}</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login/patient">
                    <Button variant="outline" fullWidth>
                      {t('landing.nav.login')}
                    </Button>
                  </Link>
                  <Link to={consultPath}>
                    <Button fullWidth>{t('landing.nav.startConsultation')}</Button>
                  </Link>
                </>
              )}
            </div>
          </ResponsiveContainer>
        </div>
      )}
    </header>
  );
}
