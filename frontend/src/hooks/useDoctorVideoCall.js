import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestVideoToken, endVideoSession, markVideoNoShow } from '../services/videoService';

// Shared join/end/no-show state machine for the doctor's side of a video call — used by both
// the dedicated Video Consultations page and the "needs attention" card on the dashboard
// overview, so the two never drift into slightly different join behavior.
export function useDoctorVideoCall({ onEnded } = {}) {
  const { t } = useTranslation();
  const [inCall, setInCall] = useState(false);
  const [callCreds, setCallCreds] = useState(null);
  const [callSessionId, setCallSessionId] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const join = async (sessionId) => {
    setError('');
    setBusy(sessionId);
    try {
      const creds = await requestVideoToken(sessionId);
      setCallCreds(creds);
      setCallSessionId(sessionId);
      setInCall(true);
    } catch (err) {
      setError(err.response?.data?.message || t('video.call.joinError'));
    } finally {
      setBusy('');
    }
  };

  const endSession = async () => {
    if (!callSessionId) return;
    try {
      await endVideoSession(callSessionId);
    } catch (err) {
      setError(err.response?.data?.message || t('video.doctor.endError'));
    }
  };

  const markNoShow = async (sessionId, reason) => {
    setBusy(sessionId);
    try {
      await markVideoNoShow(sessionId, reason);
    } catch (err) {
      setError(err.response?.data?.message || t('video.doctor.noShowError'));
    } finally {
      setBusy('');
    }
  };

  const refreshToken = () => requestVideoToken(callSessionId).then((creds) => creds.token);

  const disconnect = () => {
    setInCall(false);
    setCallCreds(null);
    setCallSessionId(null);
    onEnded?.();
  };

  return {
    inCall,
    callCreds,
    callSessionId,
    busy,
    error,
    setError,
    join,
    endSession,
    markNoShow,
    disconnect,
    refreshToken,
  };
}
