import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../LanguageSwitcher';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import {
  HomeIcon,
  ConsultIcon,
  HistoryIcon,
  PillIcon,
  UserIcon,
  LogoutIcon,
} from './icons';

const NAV = {
  patient: [
    { to: '/patient', label: 'nav.home', icon: HomeIcon, end: true },
    { to: '/patient/consultations/new', label: 'nav.startConsultation', icon: ConsultIcon },
    { to: '/patient/consultations', label: 'nav.consultations', icon: HistoryIcon },
    { to: '/patient/prescriptions', label: 'nav.prescriptions', icon: PillIcon },
    { to: '/patient/profile', label: 'nav.profile', icon: UserIcon },
  ],
  doctor: [
    { to: '/doctor', label: 'nav.overview', icon: HomeIcon, end: true },
    { to: '/doctor/consultations', label: 'nav.consultations', icon: HistoryIcon },
    { to: '/doctor/profile', label: 'nav.profile', icon: UserIcon },
  ],
};

export default function AppShell({ role }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const items = NAV[role];
  const displayName = role === 'doctor' ? user?.fullName : user?.name;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line">
        <ResponsiveContainer className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8 min-w-0">
            <span className="text-lg font-semibold text-primary-dark tracking-tight shrink-0">
              {t('app.name')}
            </span>
            <nav className="hidden md:flex items-center gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-control text-sm font-medium transition-colors ${
                      isActive ? 'bg-mint text-primary-dark' : 'text-ink-muted hover:text-ink hover:bg-surface'
                    }`
                  }
                >
                  {t(item.label)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <span className="hidden lg:block text-sm text-ink-muted truncate max-w-[160px]">
              {displayName}
            </span>
            <button
              onClick={logout}
              aria-label={t('nav.logout')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-danger px-2.5 py-2 rounded-control hover:bg-surface transition-colors min-h-[44px]"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </ResponsiveContainer>
        <div className="sm:hidden border-t border-line px-4 py-2 flex justify-end">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10">
        <ResponsiveContainer className="py-6 sm:py-8">
          <Outlet />
        </ResponsiveContainer>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-flow-col auto-cols-fr">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-[11px] font-medium ${
                    isActive ? 'text-primary-dark' : 'text-ink-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-dark' : 'text-ink-muted'}`} />
                    <span className="truncate max-w-[64px]">{t(item.label)}</span>
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
