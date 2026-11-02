import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import Logo from '../landing/Logo';
import { CLINIC_PHONES, formatPhone } from '../../constants/clinic';
import { VIDEO_CONSULTATIONS_LIVE } from '../../constants/features';
import { ComingSoonBadge } from '../ComingSoon';
import { HomeIcon, HistoryIcon, PillIcon, UserIcon, LogoutIcon, VideoIcon, MessageIcon } from './icons';

const NAV = {
  patient: [
    { to: '/patient', label: 'nav.home', icon: HomeIcon, end: true },
    { to: '/patient/video', label: 'nav.video', icon: VideoIcon, soon: !VIDEO_CONSULTATIONS_LIVE },
    { to: '/patient/consultations', label: 'nav.consultations', icon: HistoryIcon },
    { to: '/patient/prescriptions', label: 'nav.prescriptions', icon: PillIcon },
    { to: '/patient/profile', label: 'nav.profile', icon: UserIcon },
  ],
  doctor: [
    { to: '/doctor', label: 'nav.overview', icon: HomeIcon, end: true },
    { to: '/doctor/video', label: 'nav.video', icon: VideoIcon, soon: !VIDEO_CONSULTATIONS_LIVE },
    { to: '/doctor/consultations', label: 'nav.consultations', icon: HistoryIcon },
    { to: '/doctor/profile', label: 'nav.profile', icon: UserIcon },
  ],
};

const ACTIVE_PILL = 'bg-gradient-to-b from-primary-light to-primary text-canvas shadow-[0_6px_20px_-8px_rgba(200,155,60,0.8)]';

function initialsOf(name = '') {
  const parts = name.replace(/^dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'H';
}

function Avatar({ name, size = 'w-10 h-10 text-sm' }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-canvas font-bold shrink-0 ${size}`}
    >
      {initialsOf(name)}
    </span>
  );
}

// Avatar button that opens a small account card: who is signed in, the clinic's number for help,
// and log out. Closes on outside click, Escape, or navigation.
function AccountMenu({ role, displayName, email, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 xl:gap-2.5 rounded-full border py-1 pl-1 pr-2 xl:pr-3 transition-colors ${
          open ? 'border-primary/50 bg-surface-muted' : 'border-line/80 hover:border-primary/40 hover:bg-surface-muted/70'
        }`}
      >
        <Avatar name={displayName} size="w-8 h-8 text-xs" />
        <span className="hidden xl:block max-w-[120px] truncate text-sm font-medium text-ink">{displayName?.split(' ')[0]}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="menu"
        className={`absolute right-0 top-[calc(100%+10px)] w-72 origin-top-right rounded-3xl border border-line/80 bg-surface/95 p-2 shadow-pop backdrop-blur-xl transition-all duration-200 ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-95 -translate-y-1'
        }`}
      >
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent p-3">
          <Avatar name={displayName} size="w-11 h-11 text-sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
            <p className="text-xs text-ink-muted truncate">{email}</p>
          </div>
        </div>

        {role === 'patient' && (
          <a
            role="menuitem"
            href={`tel:+91${CLINIC_PHONES[0]}`}
            className="mt-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 text-primary-light">
              <MessageIcon className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{t('shell.helpTitle')}</span>
              <span className="block text-xs text-ink-muted">{formatPhone(CLINIC_PHONES[0])}</span>
            </span>
          </a>
        )}

        <button
          role="menuitem"
          type="button"
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-danger/10 group"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-muted text-ink-muted group-hover:bg-danger/15 group-hover:text-danger">
            <LogoutIcon className="w-4 h-4" />
          </span>
          <span className="text-sm font-medium text-ink group-hover:text-danger">{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const items = NAV[role];
  const displayName = role === 'doctor' ? user?.fullName : user?.name;
  const homePath = role === 'doctor' ? '/doctor' : '/patient';

  return (
    <div className="relative min-h-screen bg-canvas">
      {/* Same ambient gold wash as the landing page, so the portal feels like the same product. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(200,155,60,0.10),transparent_65%)]" />
        <div className="absolute bottom-0 left-0 w-[36rem] h-[36rem] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      {/* Desktop: floating glass bar — logo, centred pill navigation, language + account. */}
      <header className="hidden lg:block sticky top-0 z-40 px-4 xl:px-6 pt-4">
        <div className="mx-auto max-w-6xl grid grid-cols-[1fr_auto_1fr] items-center gap-4 xl:gap-6 rounded-[28px] border border-line/80 bg-surface/75 py-2.5 pl-6 pr-2.5 shadow-pop backdrop-blur-xl">
          <Link to={homePath} aria-label={t('app.name')} className="justify-self-start">
            <Logo />
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-line/70 bg-canvas/50 p-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-3 xl:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      isActive ? ACTIVE_PILL : 'text-ink-muted hover:text-ink hover:bg-surface-muted/80'
                    }`
                  }
                >
                  <Icon className="hidden xl:block w-4 h-4" />
                  {t(item.label)}
                  {item.soon && <ComingSoonBadge compact />}
                </NavLink>
              );
            })}
          </nav>

          <div className="justify-self-end flex items-center gap-2.5">
            <LanguageSwitcher />
            <AccountMenu role={role} displayName={displayName} email={user?.email} onLogout={logout} />
          </div>
        </div>
      </header>

      {/* Mobile / tablet top bar */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <Link to={homePath} aria-label={t('app.name')}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={logout}
              aria-label={t('nav.logout')}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogoutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-28 lg:pb-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-6 py-6 sm:py-8 lg:pt-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile floating tab bar — dark rounded dock; the active tab gets a gold tile and an
          underline indicator, like the reference app. */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-[28px] border border-line/80 bg-canvas/95 px-2 py-2 shadow-pop backdrop-blur-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex flex-col items-center gap-1 min-w-0 text-[10px] font-semibold transition-colors ${
                    isActive ? 'text-primary-light' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative flex items-center justify-center w-12 h-10 rounded-2xl transition-all duration-200 ${
                        isActive ? ACTIVE_PILL : 'group-hover:bg-surface-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.soon && <ComingSoonBadge compact className="absolute -top-2 -right-2" />}
                    </span>
                    <span className="truncate max-w-full px-0.5">{t(item.label)}</span>
                    <span
                      aria-hidden="true"
                      className={`h-1 rounded-full bg-primary-light transition-all duration-200 ${isActive ? 'w-5' : 'w-0'}`}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
