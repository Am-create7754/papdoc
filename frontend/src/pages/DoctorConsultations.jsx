import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchDoctorConsultations } from '../services/consultationService';
import StatusBadge from '../components/StatusBadge';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Loader';
import { HistoryIcon, SearchIcon } from '../components/layout/icons';

const TABS = ['all', 'submitted', 'under_review', 'responded', 'completed'];

const PRESCRIPTION_STYLES = {
  none: 'bg-line/50 text-ink-muted',
  generated: 'bg-mint text-primary-dark',
  failed: 'bg-warning-bg text-warning',
};

function referenceCode(id) {
  return `HF-${id.slice(-6).toUpperCase()}`;
}

export default function DoctorConsultations() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [consultations, setConsultations] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const activeTab = TABS.includes(searchParams.get('status')) ? searchParams.get('status') : 'all';

  const load = async () => {
    setError('');
    try {
      setConsultations(await fetchDoctorConsultations());
    } catch (err) {
      setError(err.response?.data?.message || t('doctorConsultations.loadError'));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const counts = useMemo(() => {
    const list = consultations || [];
    return {
      all: list.length,
      submitted: list.filter((c) => c.status === 'submitted').length,
      under_review: list.filter((c) => c.status === 'under_review').length,
      responded: list.filter((c) => c.status === 'responded').length,
      completed: list.filter((c) => c.status === 'completed').length,
    };
  }, [consultations]);

  const filtered = useMemo(() => {
    const list = consultations || [];
    const query = search.trim().toLowerCase();
    return list.filter((c) => {
      if (activeTab !== 'all' && c.status !== activeTab) return false;
      if (typeFilter !== 'all' && c.consultationType !== typeFilter) return false;
      if (query) {
        const matchesName = c.patientId?.name?.toLowerCase().includes(query);
        const matchesRef = referenceCode(c._id).toLowerCase().includes(query);
        if (!matchesName && !matchesRef) return false;
      }
      return true;
    });
  }, [consultations, activeTab, typeFilter, search]);

  const setTab = (tab) => {
    if (tab === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title={t('doctorConsultations.title')}
        backTo="/doctor"
        backLabel={t('doctorConsultations.backHome')}
      />

      {consultations && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTab(tab)}
                aria-pressed={activeTab === tab}
                className={`px-3.5 py-2 rounded-control text-sm font-medium border transition-colors min-h-[40px] ${
                  activeTab === tab
                    ? 'bg-primary-dark text-white border-primary-dark'
                    : 'bg-surface text-ink-muted border-line hover:border-primary/40'
                }`}
              >
                {t(`doctorConsultations.tabs.${tab}`)}
                <span className="ml-1.5 opacity-70">{counts[tab]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('doctorConsultations.searchPlaceholder')}
                className="w-full rounded-control border border-line bg-surface pl-9 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="all">{t('doctorConsultations.typeAll')}</option>
              <option value="standard">{t('consultation.typeStandard')}</option>
              <option value="priority">{t('consultation.typePriority')}</option>
              <option value="video">{t('consultation.typeVideo')}</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <Card className="p-6 text-center mb-4">
          <p className="text-sm text-danger mb-3">{error}</p>
          <Button variant="outline" onClick={load}>
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {!consultations && !error && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {consultations && filtered.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="w-6 h-6" />}
          title={t('doctorConsultations.title')}
          description={
            consultations.length === 0 ? t('doctorConsultations.empty') : t('doctorConsultations.noMatches')
          }
        />
      )}

      {consultations && filtered.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((c) => (
            <Link
              key={c._id}
              to={`/doctor/consultations/${c._id}`}
              className="flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-surface transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{c.patientId?.name || 'Unknown patient'}</p>
                <p className="text-sm text-ink-muted truncate mt-0.5">{c.chiefComplaint}</p>
                <p className="text-xs text-ink-muted/80 mt-1">
                  {new Date(c.createdAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · <span className="capitalize">{c.consultationType}</span> · {referenceCode(c._id)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={c.status} />
                <PaymentStatusBadge status={c.paymentStatus} />
                {c.prescriptionStatus !== 'none' && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-control text-[11px] font-medium whitespace-nowrap ${
                      PRESCRIPTION_STYLES[c.prescriptionStatus]
                    }`}
                  >
                    {t(`doctorConsultations.prescriptionStatus.${c.prescriptionStatus}`)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
