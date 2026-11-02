import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Daily from '@daily-co/daily-js';
import Button from '../ui/Button';
import { Spinner } from '../ui/Loader';
import { MicIcon, MicOffIcon, CameraIcon, CameraOffIcon, PhoneOffIcon, UsersIcon } from '../layout/icons';

// Renders one MediaStreamTrack into a <video>/<audio> element.
function TrackPlayer({ track, kind = 'video', muted = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);
  if (kind === 'audio') return <audio ref={ref} autoPlay />;
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function playableTrack(participant, kind) {
  const info = participant?.tracks?.[kind];
  return info?.state === 'playable' ? info.persistentTrack : null;
}

// Daily reports camera problems as { type } on 'camera-error'; getUserMedia-style failures are
// DOMExceptions with a `name`. Anything else (join/network errors) is a connection problem.
function mediaErrorMessage(t, err) {
  const type = err?.type || err?.name;
  if (['permissions', 'NotAllowedError', 'PermissionDeniedError'].includes(type)) return t('video.call.permissionDenied');
  if (['not-found', 'NotFoundError', 'DevicesNotFoundError'].includes(type)) return t('video.call.noDevice');
  if (['cam-in-use', 'mic-in-use', 'cam-mic-in-use', 'NotReadableError', 'TrackStartError'].includes(type)) {
    return t('video.call.deviceBusy');
  }
  if (['constraints', 'undefined-mediadevices', 'unknown'].includes(type)) return t('video.call.deviceGenericError');
  return t('video.call.connectError');
}

export default function VideoCallRoom({
  token,
  roomUrl,
  myLabel,
  remoteLabel,
  onJoined,
  onEndCall,
  onDisconnected,
  endBusy,
  canEndSession = false,
  refreshToken,
}) {
  const { t } = useTranslation();
  const callRef = useRef(null);
  // True only while actually in the call — so a failed join attempt (which Daily may also report
  // as an 'error') doesn't end the screen, and unmount cleanup doesn't fire onDisconnected.
  const inCallRef = useRef(false);

  const [phase, setPhase] = useState('precheck'); // precheck | connecting | connected | ended
  const [precheckError, setPrecheckError] = useState('');
  const [localVideo, setLocalVideo] = useState(null);
  const [remoteVideo, setRemoteVideo] = useState(null);
  const [remoteAudio, setRemoteAudio] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('connected'); // connected | reconnecting
  const [ending, setEnding] = useState(false);

  // Re-reads everyone's tracks from the call object — simpler and safer than patching state
  // per event, and Daily fires plenty of events (joined/updated/left/track-*) to drive it.
  const syncParticipants = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const participants = call.participants();
    setLocalVideo(playableTrack(participants.local, 'video'));
    const remote = Object.values(participants).find((p) => !p.local);
    setRemoteConnected(!!remote);
    setRemoteVideo(playableTrack(remote, 'video'));
    setRemoteAudio(playableTrack(remote, 'audio'));
  }, []);

  // Pre-check: start the camera/mic so the person sees themselves before joining.
  useEffect(() => {
    if (!Daily.supportedBrowser().supported) {
      setPrecheckError(t('video.call.unsupportedBrowser'));
      return undefined;
    }

    let cancelled = false;
    (async () => {
      // React StrictMode mounts twice in development; Daily allows only one call object at a time.
      await Daily.getCallInstance()?.destroy();
      if (cancelled) return;

      const call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
      callRef.current = call;

      call
        .on('participant-joined', syncParticipants)
        .on('participant-updated', syncParticipants)
        .on('participant-left', syncParticipants)
        .on('track-started', syncParticipants)
        .on('track-stopped', syncParticipants)
        .on('camera-error', (ev) => setPrecheckError(mediaErrorMessage(t, ev?.error)))
        .on('network-connection', (ev) => setConnectionState(ev?.event === 'interrupted' ? 'reconnecting' : 'connected'))
        .on('left-meeting', () => {
          if (!inCallRef.current) return;
          inCallRef.current = false;
          setPhase('ended');
          onDisconnected?.();
        })
        .on('error', () => {
          // Fatal call errors (room deleted when the doctor ends the session, ejected, etc.).
          if (!inCallRef.current) return;
          inCallRef.current = false;
          setPhase('ended');
          onDisconnected?.();
        });

      try {
        await call.startCamera();
        if (!cancelled) syncParticipants();
      } catch (err) {
        if (import.meta.env.DEV) console.error('Video pre-check device error:', err);
        if (!cancelled) setPrecheckError(mediaErrorMessage(t, err));
      }
    })();

    return () => {
      cancelled = true;
      inCallRef.current = false;
      const call = callRef.current;
      callRef.current = null;
      call?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async () => {
    const call = callRef.current;
    if (!call) return;
    setPhase('connecting');
    try {
      try {
        await call.join({ url: roomUrl, token });
      } catch (err) {
        // Tokens are short-lived; if the person lingered on the camera check, fetch a fresh one once.
        if (!refreshToken) throw err;
        await call.join({ url: roomUrl, token: await refreshToken() });
      }
      inCallRef.current = true;
      setPhase('connected');
      syncParticipants();
      onJoined?.();
    } catch (err) {
      setPrecheckError(mediaErrorMessage(t, err));
      setPhase('precheck');
    }
  };

  const toggleMic = () => {
    callRef.current?.setLocalAudio(!micOn);
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    callRef.current?.setLocalVideo(!camOn);
    setCamOn(!camOn);
  };

  // The doctor's button is session-authoritative (calls the backend /end endpoint, which
  // completes the VideoSession, deletes the Daily room and promotes the next patient). A patient
  // leaving only leaves locally — the session stays as it was, so they can rejoin if needed.
  const handleEnd = async () => {
    if (!canEndSession) {
      await callRef.current?.leave();
      return;
    }
    setEnding(true);
    try {
      await onEndCall?.();
    } finally {
      await callRef.current?.leave();
      setEnding(false);
    }
  };

  const localTile = (
    <TrackPlayer track={localVideo} muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
  );

  if (phase === 'precheck' || phase === 'connecting') {
    return (
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <div className="relative aspect-video bg-canvas">
          {localTile}
          {!localVideo && !precheckError && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70">
              <Spinner className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="p-6 text-center">
          <p className="font-medium text-ink mb-1">{t('video.call.precheckTitle')}</p>
          <p className="text-sm text-ink-muted mb-4">{t('video.call.precheckHint')}</p>
          {precheckError && (
            <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3 mb-4">
              {precheckError}
            </p>
          )}
          <Button
            size="lg"
            onClick={handleJoin}
            disabled={phase === 'connecting' || !!precheckError || !localVideo}
          >
            {phase === 'connecting' ? t('video.call.connecting') : t('video.call.joinButton')}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="rounded-card border border-line bg-surface p-10 text-center">
        <p className="font-medium text-ink">{t('video.call.callEnded')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-canvas overflow-hidden relative">
      {connectionState === 'reconnecting' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-warning-bg text-warning text-xs font-medium px-3 py-1.5 rounded-control flex items-center gap-1.5">
          <Spinner className="w-3.5 h-3.5" />
          {t('video.call.reconnecting')}
        </div>
      )}

      <div className="relative aspect-video sm:aspect-[16/9]">
        <TrackPlayer track={remoteVideo} className="absolute inset-0 w-full h-full object-cover" />
        <TrackPlayer track={remoteAudio} kind="audio" />

        {(!remoteConnected || !remoteVideo) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <UsersIcon className="w-8 h-8" />
            <p className="text-sm">
              {remoteConnected ? remoteLabel : t('video.call.waitingForRemote', { name: remoteLabel })}
            </p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video rounded-control overflow-hidden border-2 border-white/20 shadow-lg bg-black/40">
          {localTile}
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas">
              <CameraOffIcon className="w-5 h-5 text-white/60" />
            </div>
          )}
        </div>

        <p className="absolute top-3 left-3 text-white/80 text-xs font-medium bg-black/30 px-2.5 py-1 rounded-control">
          {myLabel}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 py-4 bg-canvas border-t border-white/10">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={micOn ? t('video.call.muteMic') : t('video.call.unmuteMic')}
          aria-pressed={!micOn}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'
          }`}
        >
          {micOn ? <MicIcon className="w-5 h-5" /> : <MicOffIcon className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={toggleCam}
          aria-label={camOn ? t('video.call.turnOffCamera') : t('video.call.turnOnCamera')}
          aria-pressed={!camOn}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-danger text-white'
          }`}
        >
          {camOn ? <CameraIcon className="w-5 h-5" /> : <CameraOffIcon className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          disabled={ending || endBusy}
          aria-label={canEndSession ? t('video.call.endCall') : t('video.call.leaveCall')}
          title={canEndSession ? t('video.call.endCall') : t('video.call.leaveCall')}
          className="w-14 h-12 rounded-full bg-danger text-white flex items-center justify-center hover:bg-danger/85 disabled:opacity-50 transition-colors"
        >
          <PhoneOffIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
