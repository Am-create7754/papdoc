import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import { fetchPublicDoctorProfile } from '../../services/doctorService';

const NAV_LINKS = [
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'doctor', href: '#doctor' },
  { key: 'prescriptions', href: '#prescriptions' },
  { key: 'security', href: '#security' },
];

export default function LandingFooter() {
  const { t } = useTranslation();
  const [doctor, setDoctor] = useState(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    fetchPublicDoctorProfile().then(setDoctor).catch(() => {});
  }, []);

  return (
    <footer className="border-t border-line bg-white">
      <ResponsiveContainer className="py-12 sm:py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <span className="text-lg font-semibold text-ink">{t('app.name')}</span>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-xs">{t('landing.footer.tagline')}</p>
            {doctor && (
              <p className="mt-4 text-sm text-ink-muted">
                {doctor.fullName}
                {(doctor.clinicName || doctor.city) && (
                  <> &middot; {[doctor.clinicName, doctor.city].filter(Boolean).join(', ')}</>
                )}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-ink uppercase tracking-wide mb-3">
              {t('landing.footer.navTitle')}
            </p>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-sm text-ink-muted hover:text-primary transition-colors">
                    {t(`landing.nav.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-ink uppercase tracking-wide mb-3">
              {t('landing.footer.legalTitle')}
            </p>
            <ul className="space-y-2">
              <li className="text-sm text-ink-muted">{t('landing.footer.privacy')}</li>
              <li className="text-sm text-ink-muted">{t('landing.footer.terms')}</li>
              <li className="text-sm text-ink-muted">{t('landing.footer.contact')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-muted max-w-lg">{t('landing.footer.emergencyNote')}</p>
          <p className="text-xs text-ink-muted whitespace-nowrap">
            &copy; {year} {t('app.name')}. {t('landing.footer.rights')}
          </p>
        </div>
      </ResponsiveContainer>
    </footer>
  );
}
