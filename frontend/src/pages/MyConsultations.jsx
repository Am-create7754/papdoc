import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchMyConsultations } from '../services/consultationService';
import StatusBadge from '../components/StatusBadge';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Loader';
import ConsultationProgress from '../components/ConsultationProgress';
import {
  ChevronRightIcon,
  ClockIcon,
  HistoryIcon,
  MessageIcon,
  PlusIcon,
  SearchIcon,
  VideoIcon,
} from '../components/layout/icons';

const TYPE_ICONS = { standard: MessageIcon, priority: ClockIcon, video: VideoIcon };
const DONE_STATUSES = ['completed', 'cancelled'];
const TABS = ['all', 'active', 'done'];

function isDone(c) {
  return DONE_STATUSES.includes(c.status) || c.prescriptionStatus === 'generated';
}

export default function MyConsultations() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [consultations, setConsultations] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const query = searchParams.get('q') || '';
  const locale = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';

  useEffect(() => {
    (async () => {
      try {
        setConsultations(await fetchMyConsultations());
      } catch (err) {
        setError(err.response?.data?.message || t('myConsultations.loadError'));
      }
    })();
  }, [t]);

  const setQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('q', value);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (consultations || []).filter((c) => {
      if (tab === 'active' && isDone(c)) return false;
      if (tab === 'done' && !isDone(c)) return false;
      if (!q) return true;
      return [c.chiefComplaint, c.symptoms, c.duration, c.consultationType]
        .flat()
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [consultations, tab, query]);

  const counts = useMemo(() => {
    const list = consultations || [];
    return { all: list.length, active: list.filter((c) => !isDone(c)).length, done: list.filter(isDone).length };
  }, [consultations]);

  return (
    <div>
      <PageHeader
        title={t('myConsultations.title')}
        backTo="/patient"
        backLabel={t('myConsultations.backHome')}
        actions={
          <Link to="/patient/consultations/new">
            <Button>
              <PlusIcon className="w-4 h-4" />
              {t('myConsultations.newButton')}
            </Button>
          </Link>
        }
      />

      {error && (
        <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">{error}</p>
      )}

      {consultations && consultations.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div role="tablist" className="grid grid-cols-3 rounded-2xl border border-line/80 bg-surface/80 p-1">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  tab === key
                    ? 'bg-gradient-to-b from-primary-light to-primary text-canvas shadow-soft'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t(`myConsultations.tab_${key}`)}
                <span className={`ml-1.5 text-xs ${tab === key ? 'text-canvas/70' : 'text-ink-muted/70'}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('myConsultations.searchPlaceholder')}
              aria-label={t('myConsultations.searchPlaceholder')}
              className="w-full rounded-2xl border border-line/80 bg-surface/80 py-3 pl-12 pr-4 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>
      )}

      {!consultations && !error && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {consultations && consultations.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="w-6 h-6" />}
          title={t('myConsultations.title')}
          description={t('myConsultations.empty')}
          action={
            <Link to="/patient/consultations/new">
              <Button>{t('home.startFirstConsultation')}</Button>
            </Link>
          }
        />
      )}

      {consultations && consultations.length > 0 && visible.length === 0 && (
        <p className="rounded-[22px] border border-dashed border-line py-10 text-center text-sm text-ink-muted">
          {t('myConsultations.noMatches')}
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((c) => {
          const TypeIcon = TYPE_ICONS[c.consultationType] || MessageIcon;
          return (
            <li key={c._id}>
              <Link
                to={`/patient/consultations/${c._id}`}
                className="group block rounded-[22px] border border-line/70 bg-surface/80 p-4 sm:p-5 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary-light shrink-0">
                    <TypeIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{c.chiefComplaint}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {new Date(c.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      <span className="capitalize">{c.consultationType}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                      <StatusBadge status={c.status} />
                      <PaymentStatusBadge status={c.paymentStatus} />
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={c.status} />
                      <PaymentStatusBadge status={c.paymentStatus} />
                    </div>
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-muted text-ink-muted transition-colors group-hover:bg-primary group-hover:text-canvas">
                      <ChevronRightIcon className="w-4 h-4" />
                    </span>
                  </div>
                </div>
                <ConsultationProgress consultation={c} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
