import { useTranslation } from 'react-i18next';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { ClockIcon, VideoIcon, GlobeIcon, CheckCircleIcon } from '../layout/icons';

export default function AccessAnywhereSection() {
  const { t } = useTranslation();

  const points = [
    { icon: ClockIcon, text: t('landing.access.point1') },
    { icon: VideoIcon, text: t('landing.access.point2') },
    { icon: GlobeIcon, text: t('landing.access.point3') },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <ResponsiveContainer>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-card bg-gradient-to-br from-primary-dark via-primary-dark to-[#3D2F14] p-8 sm:p-10 text-white relative overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-mint/10 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-10 w-56 h-56 rounded-full bg-white/5"
              />
              <svg
                viewBox="0 0 160 160"
                aria-hidden="true"
                className="hidden sm:block pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 text-mint/80"
              >
                <path
                  d="M34 124C34 92 70 98 80 72s40-30 46-44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 7"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path d="M18 128l16-13 16 13v18H18z" fill="currentColor" opacity="0.18" />
                <path d="M18 128l16-13 16 13v18H18z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M30 146v-9h8v9" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M126 10a14 14 0 0 0-14 14c0 11 14 24 14 24s14-13 14-24a14 14 0 0 0-14-14z" fill="currentColor" opacity="0.22" />
                <path d="M126 10a14 14 0 0 0-14 14c0 11 14 24 14 24s14-13 14-24a14 14 0 0 0-14-14z" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M126 18v12M120 24h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="80" cy="72" r="13" fill="currentColor" opacity="0.15" />
                <circle cx="80" cy="72" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="73" y="67" width="9" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M82 70l5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <div className="relative space-y-5 sm:pr-40">
                {points.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.text} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-control bg-white/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-sm text-white/90">{p.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              {t('landing.access.eyebrow')}
            </p>
            <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              {t('landing.access.title')}
            </h2>
            <p className="mt-3 text-ink-muted text-[15px] leading-relaxed max-w-md">{t('landing.access.desc')}</p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-muted">
              <CheckCircleIcon className="w-4 h-4 text-primary" />
              {t('landing.hero.trust1')}
            </p>
          </Reveal>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
