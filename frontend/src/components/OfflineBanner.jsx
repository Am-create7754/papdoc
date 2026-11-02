import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// A slim notice pinned to the top of the screen while the browser reports no connection, so a
// patient on patchy mobile data knows why a form isn't submitting.
export default function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[100] bg-warning-bg text-warning text-sm font-medium text-center px-4 py-2 border-b border-warning/30"
    >
      {t('errors.offline')}
    </div>
  );
}
