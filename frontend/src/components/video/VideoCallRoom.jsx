import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect, createLocalTracks, isSupported } from 'twilio-video';
import Button from '../ui/Button';
import { Spinner } from '../ui/Loader';
import { MicIcon, MicOffIcon, CameraIcon, CameraOffIcon, PhoneOffIcon, UsersIcon } from '../layout/icons';

function attach(track, container) {
  if (!track || !container) return;
  const el = track.attach();
  el.className = 'w-full h-full object-cover';
  el.setAttribute('playsinline', 'true');
  container.replaceChildren(el);
}

function detachAll(container) {
  if (!container) return;
  container.replaceChildren();
}

function mediaErrorMessage(t, err) {
  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    return t('video.call.permissionDenied');
  }
  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
    return t('video.call.noDevice');
  }
  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return t('video.call.deviceBusy');
  }
  return t('video.call.deviceGenericError');
}

export default function VideoCallRoom({
  token,
  roomName,
  myLabel,
  remoteLabel,
  onJoined,
  onEndCall,
  onDisconnected,
  endBusy,
  canEndSession = false,
}) {
  const { t } = useTranslation();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const roomRef = useRef(null);
  const localTracksRef = useRef([]);

  const [phase, setPhase] = useState('precheck'); // precheck | connecting | connected | ended
  const [precheckError, setPrecheckError] = useState('');
  const [localReady, setLocalReady] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('connected'); // connected | reconnecting
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!isSupported) {
      setPrecheckError(t('video.call.unsupportedBrowser'));
      return;
    }
    let cancelled = false;
    createLocalTracks({ audio: true, video: { width: 640, height: 480 } })
      .then((tracks) => {
        if (cancelled) {
          tracks.forEach((track) => track.stop());
          return;
        }
        localTracksRef.current = tracks;
        const videoTrack = tracks.find((tr) => tr.kind === 'video');
        if (videoTrack && localVideoRef.current) attach(videoTrack, localVideoRef.current);
        setLocalReady(true); // ref mutations alone don't re-render — this is what unblocks the Join button
      })
      .catch((err) => {
        console.error('Video pre-check device error:', err.name, err.message, err);
        setPrecheckError(mediaErrorMessage(t, err));
      });

    return () => {
      cancelled = true;
      localTracksRef.current.forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleParticipant = useCallback((participant) => {
    const attachIfVideo = (track) => {
      if (track.kind === 'video' && remoteVideoRef.current) attach(track, remoteVideoRef.current);
      if (track.kind === 'audio' && remoteAudioRef.current) attach(track, remoteAudioRef.current);
    };
    participant.tracks.forEach((pub) => {
      if (pub.track) attachIfVideo(pub.track);
    });
    participant.on('trackSubscribed', attachIfVideo);
    participant.on('trackUnsubscribed', (track) => {
      if (track.kind === 'video') detachAll(remoteVideoRef.current);
    });
    setRemoteConnected(true);
  }, []);

  const handleJoin = async () => {
    setPhase('connecting');
    try {
      const room = await connect(token, { name: roomName, tracks: localTracksRef.current });
      roomRef.current = room;
      setPhase('connected');

      room.participants.forEach(handleParticipant);
      room.on('participantConnected', handleParticipant);
      room.on('participantDisconnected', () => {
        setRemoteConnected(false);
        detachAll(remoteVideoRef.current);
        detachAll(remoteAudioRef.current);
      });
      room.on('reconnecting', () => setConnectionState('reconnecting'));
      room.on('reconnected', () => setConnectionState('connected'));
      room.on('disconnected', () => {
        setPhase('ended');
        onDisconnected?.();
      });

      onJoined?.();
    } catch (err) {
      setPrecheckError(mediaErrorMessage(t, err));
      setPhase('precheck');
    }
  };

  useEffect(
    () => () => {
      roomRef.current?.disconnect();
    },
    []
  );

  const toggleMic = () => {
    const audioTrack = localTracksRef.current.find((tr) => tr.kind === 'audio');
    if (!audioTrack) return;
    micOn ? audioTrack.disable() : audioTrack.enable();
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    const videoTrack = localTracksRef.current.find((tr) => tr.kind === 'video');
    if (!videoTrack) return;
    camOn ? videoTrack.disable() : videoTrack.enable();
    setCamOn(!camOn);
  };

  // The doctor's button is session-authoritative (calls the backend /end endpoint, which
  // completes the VideoSession and promotes the next patient). A patient leaving the call only
  // disconnects locally — the session and their place in it stay exactly as they were, so they
  // can rejoin with the Join button if they got disconnected by mistake.
  const handleEnd = async () => {
    if (!canEndSession) {
      roomRef.current?.disconnect();
      return;
    }
    setEnding(true);
    try {
      await onEndCall?.();
    } finally {
      roomRef.current?.disconnect();
      setEnding(false);
    }
  };

  if (phase === 'precheck' || phase === 'connecting') {
    return (
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <div className="relative aspect-video bg-primary-dark">
          <div ref={localVideoRef} className="absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
          {!localReady && !precheckError && (
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
            disabled={phase === 'connecting' || !!precheckError || !localReady}
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
    <div className="rounded-card border border-line bg-primary-dark overflow-hidden relative">
      {connectionState === 'reconnecting' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-warning-bg text-warning text-xs font-medium px-3 py-1.5 rounded-control flex items-center gap-1.5">
          <Spinner className="w-3.5 h-3.5" />
          {t('video.call.reconnecting')}
        </div>
      )}

      <div className="relative aspect-video sm:aspect-[16/9]">
        <div ref={remoteVideoRef} className="absolute inset-0 [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
        <div ref={remoteAudioRef} className="hidden" />

        {!remoteConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <UsersIcon className="w-8 h-8" />
            <p className="text-sm">{t('video.call.waitingForRemote', { name: remoteLabel })}</p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video rounded-control overflow-hidden border-2 border-white/20 shadow-lg bg-black/40">
          <div ref={localVideoRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-dark">
              <CameraOffIcon className="w-5 h-5 text-white/60" />
            </div>
          )}
        </div>

        <p className="absolute top-3 left-3 text-white/80 text-xs font-medium bg-black/30 px-2.5 py-1 rounded-control">
          {myLabel}
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 py-4 bg-primary-dark border-t border-white/10">
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
          className="w-14 h-12 rounded-full bg-[#DC2626] text-white flex items-center justify-center hover:bg-[#B91C1C] disabled:opacity-50 transition-colors"
        >
          <PhoneOffIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
