import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import { AlertIcon } from '../layout/icons';

export default function EmergencyNotice() {
  const { t } = useTranslation();

  return (
    <section className="py-8 sm:py-10">
      <ResponsiveContainer>
        <div className="rounded-card border border-warning/30 bg-warning/10 px-5 py-4 sm:px-6 sm:py-5 flex items-start gap-3">
          <AlertIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink">{t('landing.emergency.title')}</p>
            <p className="mt-0.5 text-sm text-ink-muted leading-relaxed">{t('landing.emergency.desc')}</p>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
