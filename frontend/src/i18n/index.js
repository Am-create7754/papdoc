import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import hi from './locales/hi/common.json';

const STORAGE_KEY = 'healthify_lang';

// Storage can be blocked (private mode, strict browser settings) — the app must still load.
function readStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: readStoredLanguage() || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Not persisted this time; the choice still applies for the current session.
  }
});

export default i18n;
