import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function AuthLayout({ title, subtitle, children }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="hidden lg:flex lg:w-[42%] bg-primary-dark text-white flex-col justify-between p-12 xl:p-16">
        <span className="text-xl font-semibold tracking-tight">{t('app.name')}</span>
        <div>
          <h2 className="text-3xl xl:text-4xl font-semibold leading-tight mb-4">{t('auth.tagline')}</h2>
          <p className="text-white/75 text-[15px] max-w-sm">{t('auth.taglineDesc')}</p>
        </div>
        <p className="text-white/50 text-xs">© {new Date().getFullYear()} Healthify</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-8 py-5 lg:justify-end">
          <span className="text-lg font-semibold text-primary-dark lg:hidden">{t('app.name')}</span>
          <LanguageSwitcher />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
              {subtitle && <p className="text-ink-muted mt-1.5 text-[15px]">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
