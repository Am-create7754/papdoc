import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchMyVideoSession,
  fetchVideoAvailability,
  requestVideoToken,
  reportVideoJoined,
  cancelVideoSession,
} from '../../services/videoService';
import { fetchPublicDoctorProfile } from '../../services/doctorService';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Loader';
import VideoCallRoom from '../../components/video/VideoCallRoom';
import { VideoIcon, ClockIcon } from '../../components/layout/icons';

const ACTIVE_STATUSES = ['queued', 'ready', 'active'];
const TERMINAL_LABELS = {
  completed: 'video.status.completed',
  cancelled: 'video.status.cancelled',
  expired: 'video.status.expired',
  no_show: 'video.status.noShow',
  failed: 'video.status.failed',
};

export default function PatientVideo() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [doctor, setDoctor] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callCreds, setCallCreds] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchPublicDoctorProfile().then(setDoctor).catch(() => {});
  }, []);

  const { data: session, isLoading } = useQuery({
    queryKey: ['myVideoSession'],
    queryFn: fetchMyVideoSession,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) && !inCall ? 4000 : false;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ['videoAvailability'],
    queryFn: fetchVideoAvailability,
    enabled: !session || !ACTIVE_STATUSES.includes(session.status),
  });

  const refetchSession = () => queryClient.invalidateQueries({ queryKey: ['myVideoSession'] });

  const handleJoin = async () => {
    setJoinError('');
    setJoining(true);
    try {
      const creds = await requestVideoToken(session._id);
      setCallCreds(creds);
      setInCall(true);
    } catch (err) {
      setJoinError(err.response?.data?.message || t('video.call.joinError'));
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelVideoSession(session._id);
      refetchSession();
    } catch (err) {
      setJoinError(err.response?.data?.message || t('video.queue.cancelError'));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) return <PageLoader label={t('common.loading')} />;

  if (inCall && callCreds) {
    return (
      <div>
        <PageHeader title={t('video.title')} />
        <VideoCallRoom
          token={callCreds.token}
          roomName={callCreds.roomName}
          myLabel={user?.name}
          remoteLabel={doctor?.fullName || t('video.doctorFallbackName')}
          canEndSession={false}
          onJoined={() => reportVideoJoined(session._id).then(refetchSession)}
          onDisconnected={() => {
            setInCall(false);
            setCallCreds(null);
            refetchSession();
          }}
        />
      </div>
    );
  }

  const isBookable = !session || !ACTIVE_STATUSES.includes(session.status);

  return (
    <div>
      <PageHeader title={t('video.title')} subtitle={t('video.subtitle')} />

      {isBookable && (
        <BookingView availability={availability} outcome={session} navigate={navigate} t={t} />
      )}

      {session?.status === 'queued' && (
        <QueueView session={session} doctor={doctor} onCancel={handleCancel} cancelling={cancelling} t={t} />
      )}

      {(session?.status === 'ready' || session?.status === 'active') && (
        <ReadyView
          session={session}
          doctor={doctor}
          onJoin={handleJoin}
          joining={joining}
          joinError={joinError}
          t={t}
        />
      )}
    </div>
  );
}

function BookingView({ availability, outcome, navigate, t }) {
  const showOutcome = outcome && TERMINAL_LABELS[outcome.status];

  return (
    <div className="space-y-5">
      {showOutcome && (
        <Card className="p-5 border-line">
          <p className="text-sm font-medium text-ink">{t(TERMINAL_LABELS[outcome.status])}</p>
          {outcome.status === 'completed' && outcome.consultationId && (
            <Link
              to={`/patient/consultations/${outcome.consultationId}`}
              className="text-sm font-medium text-primary-dark hover:underline mt-1 inline-block"
            >
              {t('video.viewConsultation')}
            </Link>
          )}
          {outcome.failureReason && <p className="text-sm text-ink-muted mt-1">{outcome.failureReason}</p>}
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        <div className="w-11 h-11 rounded-control bg-mint flex items-center justify-center mb-4 text-primary-dark">
          <VideoIcon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-ink mb-1.5">{t('video.booking.title')}</h2>
        <p className="text-sm text-ink-muted mb-5">{t('video.booking.subtitle')}</p>

        {!availability ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : !availability.doctorAvailable ? (
          <p className="text-sm text-warning bg-warning-bg rounded-control p-3.5">{t('video.booking.doctorPaused')}</p>
        ) : !availability.availableToday ? (
          <p className="text-sm text-warning bg-warning-bg rounded-control p-3.5">{t('video.booking.fullyBooked')}</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <Stat label={t('video.booking.fee')} value={availability.fee != null ? `₹${availability.fee}` : '—'} />
            <Stat label={t('video.booking.remainingToday')} value={availability.remainingToday} />
            <Stat
              label={t('video.booking.estimatedWait')}
              value={t('video.queue.waitMinutes', { count: availability.estimatedWaitMinutes })}
            />
          </div>
        )}

        <Button
          size="lg"
          disabled={!availability || !availability.availableToday}
          onClick={() => navigate('/patient/consultations/new')}
        >
          {t('video.booking.cta')}
        </Button>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface rounded-control p-3.5">
      <p className="text-xs font-medium text-ink-muted mb-1">{label}</p>
      <p className="text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function QueueView({ session, doctor, onCancel, cancelling, t }) {
  return (
    <Card className="p-6 sm:p-8 text-center max-w-md mx-auto">
      <div className="mx-auto w-14 h-14 rounded-full bg-mint flex items-center justify-center mb-4 text-primary-dark">
        <ClockIcon className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-semibold text-ink mb-1">{t('video.queue.title')}</h2>
      <p className="text-sm text-ink-muted mb-5">
        {session.queuePosition === 1
          ? t('video.queue.next')
          : t('video.queue.position', { position: session.queuePosition })}
      </p>
      <div className="bg-surface rounded-control p-4 mb-5 space-y-1.5 text-left">
        <Row label={t('video.queue.waitLabel')} value={t('video.queue.waitMinutes', { count: session.estimatedWaitMinutes })} />
        <Row label={t('video.queue.doctorLabel')} value={doctor?.fullName || '—'} />
        <Row label={t('video.queue.referenceLabel')} value={session.referenceCode} />
      </div>
      <Button variant="outline" onClick={onCancel} disabled={cancelling}>
        {cancelling ? t('common.loading') : t('video.queue.cancelButton')}
      </Button>
    </Card>
  );
}

function ReadyView({ session, doctor, onJoin, joining, joinError, t }) {
  return (
    <Card className="p-6 sm:p-8 text-center max-w-md mx-auto">
      <div className="mx-auto w-14 h-14 rounded-full bg-success-bg flex items-center justify-center mb-4 text-success">
        <VideoIcon className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-semibold text-ink mb-1">{t('video.ready.title')}</h2>
      <p className="text-sm text-ink-muted mb-5">
        {session.status === 'active' ? t('video.ready.inProgress') : t('video.ready.doctorJoiningSoon')}
      </p>
      {doctor?.fullName && <p className="text-sm text-ink-muted mb-5">{t('video.queue.doctorLabel')}: {doctor.fullName}</p>}
      {joinError && <p className="text-sm text-danger bg-danger-bg rounded-control p-3 mb-4">{joinError}</p>}
      <Button size="lg" onClick={onJoin} disabled={joining}>
        {joining ? t('video.call.connecting') : t('video.ready.joinButton')}
      </Button>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
