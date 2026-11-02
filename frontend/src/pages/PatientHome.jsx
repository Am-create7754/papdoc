import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyConsultations } from '../services/consultationService';
import { fetchMyVideoSession } from '../services/videoService';
import { fetchPublicDoctorProfile } from '../services/doctorService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/StatusBadge';
import ConsultationProgress from '../components/ConsultationProgress';
import { Skeleton } from '../components/ui/Loader';
import HealthTipCard, { tipOfTheDay } from '../components/health/HealthTipCard';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  MessageIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  VideoIcon,
} from '../components/layout/icons';
import { CLINIC_DIRECTIONS_URL, CLINIC_PHONES } from '../constants/clinic';
import { VIDEO_CONSULTATIONS_LIVE } from '../constants/features';
import { ComingSoonBadge } from '../components/ComingSoon';
import doctorHeroPhoto from '../assets/images/doctor-hero.jpg';

const ACTIVE_VIDEO_STATUSES = ['queued', 'ready', 'active'];
const IN_PROGRESS_STATUSES = ['submitted', 'under_review'];
const TYPE_ICONS = { standard: MessageIcon, priority: ClockIcon, video: VideoIcon };

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// Consultations per month for the last six months (oldest first), for the mini bar chart.
function lastSixMonths(consultations, locale) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const count = consultations.filter((c) => {
      const created = new Date(c.createdAt);
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
    }).length;
    return { label: d.toLocaleDateString(locale, { month: 'narrow' }), count };
  });
}

function MiniBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1.5 h-14">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-md ${i === data.length - 1 ? 'bg-canvas' : 'bg-canvas/25'}`}
            style={{ height: `${Math.max(8, (d.count / max) * 40)}px` }}
          />
          <span className="text-[9px] font-semibold text-canvas/60">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Ring({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[64px] h-[64px] shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--color-canvas) / 0.2)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgb(var(--color-canvas))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-canvas">{pct}%</span>
    </div>
  );
}

function Pulse() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-12 text-canvas" aria-hidden="true">
      <path
        d="M0 22h28l6-12 8 24 8-30 8 26 6-8h56"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Bright "health insight" tile — coloured card with a big number and a small visual, modelled
// on the reference app. Swipeable row on phones, three-up grid from `sm`.
function InsightTile({ to, tone, title, value, unit, children }) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[26px] p-4 sm:p-5 min-h-[188px] text-canvas snap-start shrink-0 w-[68%] sm:w-auto transition-transform duration-300 hover:-translate-y-1 ${tone}`}
    >
      <div aria-hidden="true" className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <ChevronRightIcon className="w-4 h-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="relative">
        <p className="font-display font-extrabold text-4xl leading-none">
          {value ?? '–'}
          {unit && <span className="ml-1.5 text-xs font-sans font-semibold opacity-70">{unit}</span>}
        </p>
        <div className="mt-3">{children}</div>
      </div>
    </Link>
  );
}

export default function PatientHome() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchMyConsultations()
      .then(setConsultations)
      .catch(() => setConsultations([]));
    fetchPublicDoctorProfile()
      .then(setDoctor)
      .catch(() => {});
  }, []);

  const { data: videoSession } = useQuery({
    queryKey: ['myVideoSessionHome'],
    queryFn: fetchMyVideoSession,
    refetchInterval: (q) => (q.state.data && ACTIVE_VIDEO_STATUSES.includes(q.state.data.status) ? 8000 : false),
  });

  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
  const showVideoCard = videoSession && ACTIVE_VIDEO_STATUSES.includes(videoSession.status);
  const firstName = user?.name?.split(' ')[0] || '';
  const all = consultations || [];
  const recent = all.slice(0, 3);
  const paidCount = all.filter((c) => c.paymentStatus === 'paid').length;
  const prescriptionCount = all.filter((c) => c.prescriptionStatus === 'generated').length;
  const inReviewCount = all.filter((c) => c.paymentStatus === 'paid' && IN_PROGRESS_STATUSES.includes(c.status)).length;

  const today = new Date().toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/patient/consultations?q=${encodeURIComponent(q)}` : '/patient/consultations');
  };

  return (
    <div className="space-y-7 lg:space-y-9">
      {/* Greeting + search */}
      <section className="grid lg:grid-cols-[1fr_minmax(320px,420px)] gap-5 lg:items-end">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-light to-primary text-canvas font-display font-bold text-xl shadow-pop shrink-0">
            {initialsOf(user?.name)}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{today}</p>
            <h1 className="mt-1 font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight truncate">
              {t('home.hello', { name: firstName })}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary-light">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                {t('home.chipConsultations', { count: all.length })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                {t('home.chipPrescriptions', { count: prescriptionCount })}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={onSearch} role="search" className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.searchPlaceholder')}
            aria-label={t('home.searchPlaceholder')}
            className="w-full rounded-2xl border border-line/80 bg-surface/80 py-3.5 pl-12 pr-4 text-[15px] text-ink placeholder:text-ink-muted/70 backdrop-blur-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </form>
      </section>

      {showVideoCard && (
        <Link to="/patient/video" className="block">
          <Card className="p-5 flex items-center justify-between gap-4 flex-wrap rounded-[26px] border-primary/40 ring-1 ring-primary/20">
            <div className="flex items-center gap-4 min-w-0">
              <span className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary-light shrink-0">
                <VideoIcon className="w-5 h-5" />
                {videoSession.status !== 'queued' && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-surface" />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {videoSession.status === 'ready'
                    ? t('video.ready.title')
                    : videoSession.status === 'active'
                      ? t('video.ready.inProgress')
                      : t('home.videoQueuedTitle')}
                </p>
                <p className="text-sm text-ink-muted mt-0.5">
                  {videoSession.status === 'queued' &&
                    `${
                      videoSession.queuePosition === 1
                        ? t('video.queue.next')
                        : t('video.queue.position', { position: videoSession.queuePosition })
                    } · ${t('video.queue.waitMinutes', { count: videoSession.estimatedWaitMinutes })}`}
                  {videoSession.status === 'ready' && t('video.ready.doctorJoiningSoon')}
                  {videoSession.status === 'active' && t('video.doctorFallbackName')}
                </p>
              </div>
            </div>
            <Button size="sm" className="shrink-0">
              {videoSession.status === 'queued' ? t('home.viewQueueButton') : t('video.ready.joinButton')}
            </Button>
          </Card>
        </Link>
      )}

      {/* Health insights */}
      <section>
        <h2 className="font-display font-bold text-lg text-ink mb-3">{t('home.insightsTitle')}</h2>
        <div className="-mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
          <InsightTile
            to="/patient/consultations"
            tone="bg-gradient-to-br from-primary-light to-primary"
            title={t('home.statConsultations')}
            value={consultations ? all.length : null}
            unit={t('home.unitTotal')}
          >
            <MiniBars data={lastSixMonths(all, locale)} />
          </InsightTile>

          <InsightTile
            to="/patient/prescriptions"
            tone="bg-gradient-to-br from-success to-success/70"
            title={t('home.statPrescriptions')}
            value={consultations ? prescriptionCount : null}
            unit={t('home.unitReady')}
          >
            <div className="flex items-center gap-3">
              <Ring value={prescriptionCount} total={paidCount} />
              <p className="text-xs font-medium leading-snug opacity-80">{t('home.ringHint')}</p>
            </div>
          </InsightTile>

          <InsightTile
            to="/patient/consultations"
            tone="bg-gradient-to-br from-danger/75 to-danger"
            title={t('home.statInProgress')}
            value={consultations ? inReviewCount : null}
            unit={t('home.unitNow')}
          >
            <Pulse />
          </InsightTile>
        </div>
      </section>

      {/* Doctor + video consultation */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4 lg:gap-6 [&>*]:min-w-0">
        <Card className="p-4 sm:p-5 rounded-[26px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink">{t('home.yourDoctor')}</h2>
            <Link to="/#doctor" className="text-xs font-semibold text-primary-light hover:text-primary">
              {t('home.viewProfile')}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={doctor?.profilePhoto || doctorHeroPhoto}
              alt={doctor?.fullName || ''}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top border border-primary/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              {doctor ? (
                <>
                  <p className="font-display font-bold text-ink text-base sm:text-lg leading-tight">
                    {doctor.fullName}
                    <CheckCircleIcon className="inline-block ml-1.5 -mt-0.5 w-4 h-4 text-primary-light" />
                  </p>
                  <p className="text-sm text-ink-muted">{doctor.specialization}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {doctor.yearsOfExperience != null && (
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                        {t('home.yearsShort', { count: doctor.yearsOfExperience })}
                      </span>
                    )}
                    {doctor.languages?.map((l) => (
                      <span key={l} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">
                        {l}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href={`tel:+91${CLINIC_PHONES[0]}`}
                aria-label={t('home.callClinic')}
                title={t('home.callClinic')}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-canvas transition-colors hover:bg-primary-light"
              >
                <PhoneIcon className="w-5 h-5" />
              </a>
              <a
                href={CLINIC_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('home.directions')}
                title={t('home.directions')}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-line text-ink transition-colors hover:border-primary/50 hover:text-primary-light"
              >
                <MapPinIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-4 sm:p-5 rounded-[26px] flex flex-col justify-between">
          <div aria-hidden="true" className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">{t('home.videoCardTitle')}</h2>
            <VideoIcon className="w-5 h-5 text-primary-light" />
          </div>
          {!VIDEO_CONSULTATIONS_LIVE ? (
            <div className="relative mt-4">
              <ComingSoonBadge />
              <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">{t('home.videoComingSoon')}</p>
            </div>
          ) : (
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-display font-extrabold text-4xl text-ink leading-none">
                {doctor?.videoConsultationFee ? `₹${doctor.videoConsultationFee}` : '—'}
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">{t('home.videoCardDesc')}</p>
            </div>
            <Link
              to="/patient/video"
              aria-label={t('home.videoCardTitle')}
              className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-light to-primary text-canvas shadow-pop transition-transform duration-200 hover:scale-105 active:scale-95 shrink-0"
            >
              <PlusIcon className="w-7 h-7" />
            </Link>
          </div>
          )}
        </Card>
      </section>

      {/* Consultations + tip */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6 [&>*]:min-w-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-ink">{t('home.recentTitle')}</h2>
            {recent.length > 0 && (
              <Link to="/patient/consultations" className="text-sm font-semibold text-primary-light hover:text-primary">
                {t('home.viewAll')}
              </Link>
            )}
          </div>

          {consultations === null && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          {consultations !== null && recent.length === 0 && (
            <Card className="rounded-[26px] text-center py-10 px-6">
              <span className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 ring-1 ring-primary/30 text-primary-light">
                <MessageIcon className="w-6 h-6" />
              </span>
              <p className="mt-4 font-semibold text-ink">{t('home.noRecentConsultation')}</p>
              <p className="mt-1 text-sm text-ink-muted max-w-xs mx-auto">{t('home.noRecentHint')}</p>
              <Link to="/patient/consultations/new" className="inline-block mt-5">
                <Button variant="outline">{t('home.startFirstConsultation')}</Button>
              </Link>
            </Card>
          )}

          <ul className="space-y-3">
            {recent.map((c) => {
              const TypeIcon = TYPE_ICONS[c.consultationType] || MessageIcon;
              return (
                <li key={c._id}>
                  <Link
                    to={`/patient/consultations/${c._id}`}
                    className="group block rounded-[22px] border border-line/70 bg-surface/80 p-4 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary-light shrink-0">
                        <TypeIcon className="w-5 h-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{c.chiefComplaint}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {new Date(c.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                          {' · '}
                          <span className="capitalize">{c.consultationType}</span>
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                      <span className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-surface-muted text-ink-muted transition-colors group-hover:bg-primary group-hover:text-canvas">
                        <ChevronRightIcon className="w-4 h-4" />
                      </span>
                    </div>
                    <ConsultationProgress consultation={c} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-ink mb-3">{t('tips.todayBadge')}</h2>
          <HealthTipCard tip={tipOfTheDay()} index={0} label={t('tips.eyebrow')} />
        </div>
      </section>
    </div>
  );
}
