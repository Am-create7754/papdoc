import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDoctorVideoQueue, reportVideoJoined } from '../../services/videoService';
import { fetchMyDoctorProfile, updateMyDoctorProfile } from '../../services/doctorService';
import { useDoctorVideoCall } from '../../hooks/useDoctorVideoCall';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Loader';
import VideoCallRoom from '../../components/video/VideoCallRoom';
import { VideoIcon, ClockIcon } from '../../components/layout/icons';

export default function DoctorVideo() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  const refetchQueue = () => queryClient.invalidateQueries({ queryKey: ['doctorVideoQueue'] });

  const { inCall, callCreds, callSessionId, busy, error, setError, join, endSession, markNoShow, disconnect, refreshToken } =
    useDoctorVideoCall({ onEnded: refetchQueue });

  const { data: queueView, isLoading } = useQuery({
    queryKey: ['doctorVideoQueue'],
    queryFn: fetchDoctorVideoQueue,
    refetchInterval: inCall ? false : 5000,
  });

  const { data: profile } = useQuery({ queryKey: ['myDoctorProfile'], queryFn: fetchMyDoctorProfile });

  const handleEndSession = async () => {
    await endSession(); // refetch happens via disconnect()'s onEnded once the call room closes
  };

  const handleNoShow = async (sessionId) => {
    await markNoShow(sessionId, 'Patient did not join in time.');
    refetchQueue();
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    setAvailabilitySaving(true);
    try {
      await updateMyDoctorProfile({ videoConsultationEnabled: !profile.videoConsultationEnabled });
      queryClient.invalidateQueries({ queryKey: ['myDoctorProfile'] });
    } catch (err) {
      setError(err.response?.data?.message || t('video.doctor.availabilityError'));
    } finally {
      setAvailabilitySaving(false);
    }
  };

  if (isLoading) return <PageLoader label={t('common.loading')} />;

  if (inCall && callCreds) {
    return (
      <div>
        <PageHeader title={t('video.doctor.title')} />
        <VideoCallRoom
          token={callCreds.token}
          roomUrl={callCreds.roomUrl}
          myLabel={profile?.fullName || t('video.doctorFallbackName')}
          remoteLabel={queueView?.active?.patientName || t('video.patientFallbackName')}
          canEndSession
          refreshToken={refreshToken}
          endBusy={false}
          onJoined={() => reportVideoJoined(callSessionId)}
          onEndCall={handleEndSession}
          onDisconnected={disconnect}
        />
      </div>
    );
  }

  const { active, queue } = queueView || { active: null, queue: [] };

  return (
    <div>
      <PageHeader
        title={t('video.doctor.title')}
        subtitle={t('video.doctor.subtitle')}
        actions={
          profile && (
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={availabilitySaving}
              className={`inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-control border transition-colors min-h-[44px] ${
                profile.videoConsultationEnabled
                  ? 'bg-success-bg text-success border-success/20'
                  : 'bg-line/40 text-ink-muted border-line'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${profile.videoConsultationEnabled ? 'bg-success' : 'bg-ink-muted'}`} />
              {profile.videoConsultationEnabled ? t('video.doctor.available') : t('video.doctor.paused')}
            </button>
          )
        }
      />

      {error && <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">{error}</p>}

      <div className="space-y-5">
        <section>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">{t('video.doctor.activeSection')}</h2>
          {active ? (
            <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{active.patientName}</p>
                <p className="text-sm text-ink-muted truncate mt-0.5">{active.complaint}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {active.status === 'active'
                    ? t('video.doctor.callInProgress')
                    : t('video.doctor.waitingToJoin')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {active.status === 'ready' && !active.patientJoinedAt && (
                  <Button variant="outline" onClick={() => handleNoShow(active._id)} disabled={busy === active._id}>
                    {t('video.doctor.markNoShow')}
                  </Button>
                )}
                <Button onClick={() => join(active._id)} disabled={busy === active._id}>
                  {busy === active._id ? t('video.call.connecting') : t('video.doctor.joinButton')}
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState icon={<VideoIcon className="w-6 h-6" />} title={t('video.doctor.noActiveTitle')} description={t('video.doctor.noActiveDesc')} />
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            {t('video.doctor.queueSection', { count: queue.length })}
          </h2>
          {queue.length === 0 ? (
            <EmptyState icon={<ClockIcon className="w-6 h-6" />} title={t('video.doctor.emptyQueueTitle')} description={t('video.doctor.emptyQueueDesc')} />
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {queue.map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-mint text-primary-dark text-xs font-semibold flex items-center justify-center">
                      {item.position}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{item.patientName}</p>
                      <p className="text-sm text-ink-muted truncate">{item.complaint}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-muted shrink-0">
                    {t('video.queue.waitMinutes', { count: item.estimatedWaitMinutes })}
                  </p>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
