import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language;

  const toggle = (lng) => {
    if (lng !== current) i18n.changeLanguage(lng);
  };

  return (
    <div
      className={`inline-flex items-center bg-surface border border-line rounded-control p-0.5 text-sm ${className}`}
      role="group"
      aria-label="Language"
    >
      {['en', 'hi'].map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => toggle(lng)}
          aria-pressed={current === lng}
          className={`px-2.5 py-1.5 rounded-[8px] font-medium transition-colors min-h-[36px] ${
            current === lng ? 'bg-surface text-primary-dark shadow-soft' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {lng === 'en' ? 'EN' : 'हि'}
        </button>
      ))}
    </div>
  );
}
