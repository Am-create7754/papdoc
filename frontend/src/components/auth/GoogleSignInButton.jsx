import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiScriptPromise;

function loadGsiScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiScriptPromise = undefined;
        reject(new Error('Failed to load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiScriptPromise;
}

// Google's own rendered "Sign in with Google" button (Google Identity Services). On success it
// hands back an ID token (`credential`) which the backend verifies. Renders nothing until a
// client ID is configured, so the auth pages keep working without one.
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          logo_alignment: 'center',
          locale: i18n.language,
          width: Math.min(containerRef.current.offsetWidth || 360, 400),
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [i18n.language, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div className="flex items-center gap-3 my-6" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs uppercase tracking-wide text-ink-muted">{t('auth.or')}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      {failed ? (
        <p className="text-sm text-danger text-center">{t('auth.googleUnavailable')}</p>
      ) : (
        <div ref={containerRef} className="flex justify-center min-h-[44px]" />
      )}
    </div>
  );
}
