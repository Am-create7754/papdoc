import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { fetchDoctorConsultations } from '../services/consultationService';
import { fetchDoctorVideoQueue, reportVideoJoined } from '../services/videoService';
import { fetchMyDoctorProfile, updateMyDoctorProfile } from '../services/doctorService';
import { useDoctorVideoCall } from '../hooks/useDoctorVideoCall';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/StatusBadge';
import { CardSkeleton } from '../components/ui/Loader';
import VideoCallRoom from '../components/video/VideoCallRoom';
import { HistoryIcon, UserIcon, ClockIcon, CheckCircleIcon, MessageIcon } from '../components/layout/icons';

function isToday(date) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// Every count here is derived from fields the existing /doctor/consultations and video queue
// APIs already return — nothing invented, nothing double-fetched.
function summarize(consultations, queueView) {
  const list = consultations || [];
  const queue = queueView?.queue || [];
  const active = queueView?.active || null;

  return {
    newCount: list.filter((c) => c.status === 'submitted' && c.paymentStatus === 'paid').length,
    underReviewCount: list.filter((c) => c.status === 'under_review').length,
    videoWaitingCount: queue.length + (active && active.status === 'ready' ? 1 : 0),
    completedTodayCount: list.filter((c) => c.status === 'completed' && isToday(c.updatedAt)).length,
    prescriptionsTodayCount: list.filter(
      (c) => c.prescriptionStatus === 'generated' && isToday(c.prescriptionGeneratedAt)
    ).length,
  };
}

export default function DoctorHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  const { data: consultations, isLoading: loadingConsultations, isError: consultationsError, refetch: refetchConsultations } =
    useQuery({
      queryKey: ['doctorConsultations'],
      queryFn: fetchDoctorConsultations,
      refetchInterval: 30000,
    });

  const refetchQueue = () => queryClient.invalidateQueries({ queryKey: ['doctorVideoQueue'] });
  const videoCall = useDoctorVideoCall({ onEnded: refetchQueue });

  const { data: queueView, isLoading: loadingQueue, isError: queueError } = useQuery({
    queryKey: ['doctorVideoQueue'],
    queryFn: fetchDoctorVideoQueue,
    refetchInterval: videoCall.inCall ? false : 10000,
  });

  const { data: profile } = useQuery({ queryKey: ['myDoctorProfile'], queryFn: fetchMyDoctorProfile });

  const summary = useMemo(() => summarize(consultations, queueView), [consultations, queueView]);

  // Passive notifications — fire only when a poll reveals a genuinely new item, never on the
  // initial load (there's nothing "new" about data the doctor is seeing for the first time).
  const notify = useToast();
  const seenSubmittedIds = useRef(null);
  const seenReadyPatientId = useRef(undefined);
  useEffect(() => {
    if (!consultations) return;
    const currentIds = new Set(
      consultations.filter((c) => c.status === 'submitted' && c.paymentStatus === 'paid').map((c) => c._id)
    );
    if (seenSubmittedIds.current) {
      const isNew = [...currentIds].some((cid) => !seenSubmittedIds.current.has(cid));
      if (isNew) notify(t('doctorDashboard.notify.newConsultation'), { tone: 'info' });
    }
    seenSubmittedIds.current = currentIds;
  }, [consultations, notify, t]);

  useEffect(() => {
    const readyId = queueView?.active?.status === 'ready' ? queueView.active._id : null;
    if (seenReadyPatientId.current !== undefined && readyId && readyId !== seenReadyPatientId.current) {
      notify(t('doctorDashboard.notify.patientReady'), { tone: 'info' });
    }
    seenReadyPatientId.current = readyId;
  }, [queueView?.active?._id, queueView?.active?.status, notify, t]);

  const goToConsultations = (status) => navigate(`/doctor/consultations${status ? `?status=${status}` : ''}`);

  const toggleAvailability = async () => {
    if (!profile) return;
    setAvailabilitySaving(true);
    try {
      await updateMyDoctorProfile({ videoConsultationEnabled: !profile.videoConsultationEnabled });
      queryClient.invalidateQueries({ queryKey: ['myDoctorProfile'] });
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleEndSession = async () => {
    await videoCall.endSession();
  };

  const handleNoShow = async (sessionId) => {
    await videoCall.markNoShow(sessionId, 'Patient did not join in time.');
    refetchQueue();
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('doctorDashboard.greetingMorning');
    if (hour < 17) return t('doctorDashboard.greetingAfternoon');
    return t('doctorDashboard.greetingEvening');
  }, [t]);

  const lastName = user?.fullName?.split(' ').filter(Boolean).slice(-1)[0] || '';

  if (videoCall.inCall && videoCall.callCreds) {
    return (
      <VideoCallRoom
        token={videoCall.callCreds.token}
        roomUrl={videoCall.callCreds.roomUrl}
        myLabel={user?.fullName || t('video.doctorFallbackName')}
        remoteLabel={queueView?.active?.patientName || t('video.patientFallbackName')}
        canEndSession
        refreshToken={videoCall.refreshToken}
        onJoined={() => reportVideoJoined(videoCall.callSessionId)}
        onEndCall={handleEndSession}
        onDisconnected={videoCall.disconnect}
      />
    );
  }

  const submittedPaid = (consultations || []).filter((c) => c.status === 'submitted' && c.paymentStatus === 'paid');
  const underReview = (consultations || []).filter((c) => c.status === 'under_review');
  const { active, queue } = queueView || { active: null, queue: [] };
  const hasAttentionItems =
    active || queue.length > 0 || submittedPaid.length > 0 || underReview.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
            {t('doctorDashboard.greeting', { time: greeting, name: lastName })}
          </h1>
          <p className="text-ink-muted mt-1 text-[15px]">{t('doctorDashboard.subtitle')}</p>
        </div>
        {profile && (
          <button
            type="button"
            onClick={toggleAvailability}
            disabled={availabilitySaving}
            className={`inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-control border transition-colors min-h-[44px] shrink-0 ${
              profile.videoConsultationEnabled
                ? 'bg-success-bg text-success border-success/20'
                : 'bg-line/40 text-ink-muted border-line'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${profile.videoConsultationEnabled ? 'bg-success' : 'bg-ink-muted'}`} />
            {profile.videoConsultationEnabled ? t('video.doctor.available') : t('video.doctor.paused')}
          </button>
        )}
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 [&>*]:min-w-0">
        <SummaryCard
          label={t('doctorDashboard.summary.newConsultations')}
          value={consultations ? summary.newCount : null}
          onClick={() => goToConsultations('submitted')}
        />
        <SummaryCard
          label={t('doctorDashboard.summary.underReview')}
          value={consultations ? summary.underReviewCount : null}
          onClick={() => goToConsultations('under_review')}
        />
        <SummaryCard
          label={t('doctorDashboard.summary.videoWaiting')}
          value={queueView ? summary.videoWaitingCount : null}
          onClick={() => navigate('/doctor/video')}
          accent
        />
        <SummaryCard
          label={t('doctorDashboard.summary.completedToday')}
          value={consultations ? summary.completedTodayCount : null}
          onClick={() => goToConsultations('completed')}
        />
        <SummaryCard
          label={t('doctorDashboard.summary.prescriptionsToday')}
          value={consultations ? summary.prescriptionsTodayCount : null}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
          {t('doctorDashboard.attention.title')}
        </h2>

        {(loadingConsultations || loadingQueue) && !consultations && !queueView && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {(consultationsError || queueError) && (
          <Card className="p-6 text-center">
            <p className="text-sm text-danger mb-3">{t('doctorDashboard.attention.loadError')}</p>
            <Button variant="outline" onClick={() => refetchConsultations()}>
              {t('doctorDashboard.attention.retry')}
            </Button>
          </Card>
        )}

        {consultations && queueView && !hasAttentionItems && (
          <Card className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mb-3 text-success">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <p className="font-medium text-ink">{t('doctorDashboard.attention.allCaughtUpTitle')}</p>
            <p className="text-sm text-ink-muted mt-1">{t('doctorDashboard.attention.allCaughtUpDesc')}</p>
          </Card>
        )}

        <div className="space-y-4">
          {/* Active video consultation */}
          {active?.status === 'active' && (
            <Card className="p-5 sm:p-6 border-primary/30 ring-1 ring-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" aria-hidden="true" />
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {t('doctorDashboard.video.activeTitle')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{active.patientName}</p>
                  <p className="text-sm text-ink-muted truncate mt-0.5">{active.complaint}</p>
                  {active.referenceCode && (
                    <p className="text-xs text-ink-muted/80 mt-1">{active.referenceCode}</p>
                  )}
                  {active.startedAt && (
                    <p className="text-xs text-ink-muted mt-1">
                      {t('doctorDashboard.video.startedAt', {
                        time: new Date(active.startedAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      })}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => videoCall.join(active._id)}
                  disabled={videoCall.busy === active._id}
                  className="shrink-0"
                >
                  {videoCall.busy === active._id ? t('video.call.connecting') : t('doctorDashboard.video.rejoinButton')}
                </Button>
              </div>
            </Card>
          )}

          {/* Next video patient */}
          {active?.status === 'ready' && (
            <Card className="p-5 sm:p-6 border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                {t('doctorDashboard.video.nextTitle')}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{active.patientName}</p>
                  <p className="text-sm text-ink-muted truncate mt-0.5">{active.complaint}</p>
                  {active.referenceCode && (
                    <p className="text-xs text-ink-muted/80 mt-1">{active.referenceCode}</p>
                  )}
                  <p className="text-xs text-ink-muted mt-1">
                    {active.patientJoinedAt
                      ? t('doctorDashboard.video.patientWaiting')
                      : t('video.doctor.waitingToJoin')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!active.patientJoinedAt && (
                    <Button
                      variant="outline"
                      onClick={() => handleNoShow(active._id)}
                      disabled={videoCall.busy === active._id}
                    >
                      {t('video.doctor.markNoShow')}
                    </Button>
                  )}
                  <Button onClick={() => videoCall.join(active._id)} disabled={videoCall.busy === active._id}>
                    {videoCall.busy === active._id ? t('video.call.connecting') : t('video.doctor.joinButton')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {videoCall.error && (
            <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">
              {videoCall.error}
            </p>
          )}

          {/* Video queue */}
          {queue.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-line">
                <p className="text-sm font-medium text-ink">
                  {t('doctorDashboard.video.queueTitle', { count: queue.length })}
                </p>
                <Link to="/doctor/video" className="text-sm font-medium text-primary-dark hover:underline shrink-0">
                  {t('doctorDashboard.viewAll')}
                </Link>
              </div>
              <div className="divide-y divide-line">
                {queue.slice(0, 3).map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-mint text-primary-dark text-xs font-semibold flex items-center justify-center">
                        {item.position}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{item.patientName}</p>
                        <p className="text-xs text-ink-muted truncate">{item.complaint}</p>
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted shrink-0">
                      {t('video.queue.waitMinutes', { count: item.estimatedWaitMinutes })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* New paid consultations */}
          {submittedPaid.length > 0 && (
            <AttentionListCard
              title={t('doctorDashboard.attention.newTitle', { count: submittedPaid.length })}
              items={submittedPaid}
              viewAllTo="/doctor/consultations?status=submitted"
              t={t}
            />
          )}

          {/* Awaiting doctor response */}
          {underReview.length > 0 && (
            <AttentionListCard
              title={t('doctorDashboard.attention.underReviewTitle', { count: underReview.length })}
              items={underReview}
              viewAllTo="/doctor/consultations?status=under_review"
              icon={MessageIcon}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-5 [&>*]:min-w-0">
        <Link to="/doctor/consultations">
          <Card className="p-6 h-full bg-primary-dark text-white border-none hover:opacity-95 transition-opacity">
            <div className="w-11 h-11 rounded-control bg-white/15 flex items-center justify-center mb-4">
              <HistoryIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold mb-1">{t('home.viewConsultationsTitle')}</h2>
            <p className="text-white/75 text-sm">{t('home.viewConsultationsDesc')}</p>
          </Card>
        </Link>

        <Link to="/doctor/profile">
          <Card className="p-6 h-full hover:border-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-control bg-mint flex items-center justify-center mb-4 text-primary-dark">
              <UserIcon className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-ink mb-1">{t('home.editProfileTitle')}</h2>
            <p className="text-ink-muted text-sm">{t('home.editProfileDesc')}</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, onClick, accent, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left bg-surface rounded-card border border-line/70 shadow-soft p-4 transition-colors ${
        onClick ? 'hover:border-primary/40 cursor-pointer' : ''
      } ${className}`}
    >
      <p className={`text-2xl font-semibold ${accent ? 'text-primary' : 'text-ink'}`}>
        {value === null || value === undefined ? '—' : value}
      </p>
      <p className="text-xs text-ink-muted mt-1 leading-snug">{label}</p>
    </Tag>
  );
}

function AttentionListCard({ title, items, viewAllTo, icon: Icon = ClockIcon, t }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-line">
        <p className="text-sm font-medium text-ink flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </p>
        <Link to={viewAllTo} className="text-sm font-medium text-primary-dark hover:underline shrink-0">
          {t('doctorDashboard.viewAll')}
        </Link>
      </div>
      <div className="divide-y divide-line">
        {items.slice(0, 4).map((c) => (
          <Link
            key={c._id}
            to={`/doctor/consultations/${c._id}`}
            className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-surface-muted transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{c.patientId?.name || 'Unknown patient'}</p>
              <p className="text-xs text-ink-muted truncate">{c.chiefComplaint}</p>
            </div>
            <StatusBadge status={c.status} />
          </Link>
        ))}
      </div>
    </Card>
  );
}
