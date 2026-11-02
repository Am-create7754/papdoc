import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, VideoIcon } from './layout/icons';

function Sparkle({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M8 1.5l1.4 4.1L13.5 7 9.4 8.4 8 12.5 6.6 8.4 2.5 7l4.1-1.4L8 1.5z" fill="currentColor" />
    </svg>
  );
}

// Small gold "Coming soon" pill for options, nav items and cards.
export function ComingSoonBadge({ className = '', compact = false }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 to-primary/10 font-semibold uppercase tracking-wide text-primary-light ${
        compact ? 'px-1.5 py-px text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
      } ${className}`}
    >
      {!compact && <Sparkle className="w-3 h-3" />}
      {compact ? t('common.soon') : t('common.comingSoon')}
    </span>
  );
}

// Full page shown on the video routes while video consultations are not live yet.
export function VideoComingSoon({ role = 'patient' }) {
  const { t } = useTranslation();
  const points = ['point1', 'point2', 'point3'];

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-primary/25 bg-gradient-to-br from-primary/20 via-surface to-surface p-7 sm:p-10 text-center shadow-pop">
        <div aria-hidden="true" className="absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-light to-primary text-canvas shadow-pop">
          <VideoIcon className="h-9 w-9" />
          <Sparkle className="absolute -right-2 -top-2 h-5 w-5 text-primary-light" />
        </div>

        <ComingSoonBadge className="relative mt-6" />
        <h1 className="relative mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t('video.comingSoon.title')}
        </h1>
        <p className="relative mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {t(role === 'doctor' ? 'video.comingSoon.descDoctor' : 'video.comingSoon.desc')}
        </p>

        <ul className="relative mx-auto mt-6 max-w-sm space-y-2.5 text-left">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-ink">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
              {t(`video.comingSoon.${p}`)}
            </li>
          ))}
        </ul>

        <Link
          to={role === 'doctor' ? '/doctor' : '/patient/consultations/new'}
          className="relative mt-8 inline-flex items-center justify-center rounded-control bg-primary px-6 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-primary-light"
        >
          {t(role === 'doctor' ? 'video.comingSoon.ctaDoctor' : 'video.comingSoon.ctaPatient')}
        </Link>
      </div>
    </div>
  );
}
