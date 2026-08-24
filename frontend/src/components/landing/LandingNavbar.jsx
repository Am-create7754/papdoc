import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import Button from '../ui/Button';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Logo from './Logo';
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
    <header className="sticky top-3 sm:top-5 z-40 px-3 sm:px-5">
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`mx-auto max-w-content border border-primary/15 bg-surface/60 backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,border-radius] duration-300 ${
          open ? 'rounded-3xl' : 'rounded-full'
        } ${scrolled ? 'shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(212,175,55,0.06)]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]'}`}
      >
        <ResponsiveContainer className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted hover:text-primary-light transition-colors"
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
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-control text-ink hover:bg-surface-muted"
          >
            {open ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </ResponsiveContainer>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden border-t border-primary/10 overflow-hidden"
            >
              <ResponsiveContainer className="py-4 flex flex-col gap-1">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-3 rounded-control text-[13px] font-semibold uppercase tracking-[0.1em] text-ink hover:bg-surface-muted"
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
