const VideoSession = require('../models/VideoSession');
const VideoDailyCounter = require('../models/VideoDailyCounter');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');
const { consultationReferenceCode } = require('../utils/reference');
const whatsappService = require('./whatsappService');

// Swappable only for tests (see tests/video.service.test.js) — production always uses the
// real Twilio-backed implementation.
let twilioProvider = require('./twilioService');
function __setTwilioProviderForTests(provider) {
  twilioProvider = provider || require('./twilioService');
}

const CANCELLABLE_STATUSES = ['queued', 'ready'];

function dayKeyFor(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// --- Daily cap (atomic) -----------------------------------------------------------------

async function getTodayCount(dayKey) {
  const doc = await VideoDailyCounter.findOne({ dayKey });
  return doc?.count || 0;
}

async function reserveDailySlot(dayKey) {
  try {
    await VideoDailyCounter.findOneAndUpdate(
      { dayKey },
      { $setOnInsert: { dayKey, count: 0 } },
      { upsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) throw err; // concurrent first-booking-of-the-day race — doc exists now, continue
  }

  const updated = await VideoDailyCounter.findOneAndUpdate(
    { dayKey, count: { $lt: env.videoMaxDailyConsultations } },
    { $inc: { count: 1 } },
    { new: true }
  );
  return !!updated;
}

async function releaseDailySlot(dayKey) {
  await VideoDailyCounter.findOneAndUpdate({ dayKey, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

// --- Availability -------------------------------------------------------------------------

async function getAvailability() {
  const doctor = await Doctor.findOne({ isActive: true });
  const dayKey = dayKeyFor();
  const usedToday = await getTodayCount(dayKey);
  const remainingToday = Math.max(0, env.videoMaxDailyConsultations - usedToday);
  const doctorAvailable = !!doctor?.videoConsultationEnabled;

  const occupied = doctor
    ? await VideoSession.findOne({ doctorId: doctor._id, status: { $in: VideoSession.OCCUPYING_STATUSES } })
    : null;
  const queuedCount = doctor ? await VideoSession.countDocuments({ doctorId: doctor._id, status: 'queued' }) : 0;
  const patientsAhead = queuedCount + (occupied ? 1 : 0);

  return {
    availableToday: doctorAvailable && remainingToday > 0,
    remainingToday,
    doctorAvailable,
    fee: doctor?.videoConsultationFee ?? null,
    estimatedWaitMinutes: patientsAhead * env.videoDefaultSessionMinutes,
    config: {
      defaultSessionMinutes: env.videoDefaultSessionMinutes,
      doctorJoinGraceMinutes: env.videoDoctorJoinGraceMinutes,
      patientJoinTimeoutMinutes: env.videoPatientJoinTimeoutMinutes,
    },
  };
}

async function assertBookableForOrder(doctor) {
  if (!doctor.videoConsultationEnabled) {
    throw new ApiError(409, 'Video consultations are currently unavailable.');
  }
  const usedToday = await getTodayCount(dayKeyFor());
  if (usedToday >= env.videoMaxDailyConsultations) {
    throw new ApiError(409, 'Video consultations are fully booked for today.');
  }
}

// --- Doctor alerts (operational only — isolated from the consultation reply/prescription flow) ---

async function notifyDoctorVideoAlertSafely(kind) {
  const messages = {
    new_paid: 'A patient has paid for a video consultation and joined the queue.',
    patient_ready: 'A patient is ready for their video consultation. Please join within a few minutes.',
    cancelled: 'A patient cancelled their queued video consultation.',
    no_show: 'A patient did not join their video consultation in time.',
  };
  try {
    await whatsappService.sendVideoOperationalAlert(messages[kind] || 'Video consultation update.');
  } catch (err) {
    console.error('Video WhatsApp alert failed:', err.message);
  }
}

// --- Queue engine -------------------------------------------------------------------------

async function expireIfStale(session) {
  const isStale =
    session.status === 'ready' &&
    session.expiresAt &&
    session.expiresAt.getTime() < Date.now() &&
    !session.patientJoinedAt;

  if (!isStale) return false;

  session.status = 'expired';
  session.endedAt = new Date();
  session.noShowReason = session.noShowReason || 'Patient did not join within the join window.';
  await session.save().catch(() => {}); // lost the race to another reconciler — fine, state already moved on

  console.log('VideoSession expired (patient no-show):', session._id.toString());
  return true;
}

async function reconcileOccupyingSession(doctorId) {
  const occupied = await VideoSession.findOne({ doctorId, status: { $in: VideoSession.OCCUPYING_STATUSES } });
  if (!occupied) return null;
  const expired = await expireIfStale(occupied);
  return expired ? null : occupied;
}

async function touchAndMaybePromote(session) {
  const expired = await expireIfStale(session);
  if (expired || session.status === 'queued') {
    // Also covers the case where the doctor re-enabled availability after a pause — promotion
    // has no other trigger for an already-queued session, so a patient's own status poll needs
    // to be able to advance the queue too, not just the doctor's dashboard.
    await promoteNextIfFree(session.doctorId);
  }
  return expired;
}

async function promoteNextIfFree(doctorId) {
  const stillOccupied = await reconcileOccupyingSession(doctorId);
  if (stillOccupied) return null;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.videoConsultationEnabled) return null;

  const next = await VideoSession.findOne({ doctorId, status: 'queued' }).sort({ queuedAt: 1, _id: 1 });
  if (!next) return null;

  const now = new Date();
  next.status = 'ready';
  next.readyAt = now;
  next.expiresAt = new Date(now.getTime() + env.videoPatientJoinTimeoutMinutes * 60000);

  try {
    await next.save();
  } catch (err) {
    if (err.code === 11000) return null; // another promotion won this doctor's single slot first
    throw err;
  }

  console.log('VideoSession promoted to ready:', next._id.toString());
  await notifyDoctorVideoAlertSafely('patient_ready');
  return next;
}

async function createSessionAfterPayment(consultation) {
  // Verify + webhook can both fire for the same paid consultation — creation must be idempotent.
  const existing = await VideoSession.findOne({ consultationId: consultation._id });
  if (existing) return existing;

  const doctor = await Doctor.findById(consultation.doctorId);
  const dayKey = dayKeyFor();
  const baseFields = {
    consultationId: consultation._id,
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    dayKey,
    requestedAt: consultation.createdAt,
    queuedAt: new Date(),
  };

  if (!doctor || !doctor.videoConsultationEnabled) {
    return VideoSession.create({
      ...baseFields,
      status: 'failed',
      failureReason: 'Video consultations were paused before this booking could be queued.',
    });
  }

  const reserved = await reserveDailySlot(dayKey);
  if (!reserved) {
    return VideoSession.create({
      ...baseFields,
      status: 'failed',
      failureReason: "Today's video consultations were fully booked before this payment completed.",
    });
  }

  const session = await VideoSession.create({ ...baseFields, status: 'queued' });
  console.log('VideoSession queued:', session._id.toString(), 'for consultation', consultation._id.toString());

  await notifyDoctorVideoAlertSafely('new_paid');
  await promoteNextIfFree(consultation.doctorId);

  return session;
}

// --- Ownership -----------------------------------------------------------------------------

function assertOwnership(session, requester) {
  if (requester.role === 'patient' && session.patientId.toString() !== requester.user._id.toString()) {
    throw new ApiError(403, 'This video session does not belong to you');
  }
  if (requester.role === 'doctor' && session.doctorId.toString() !== requester.user._id.toString()) {
    throw new ApiError(403, 'This video session does not belong to you');
  }
}

// --- Views (never expose Twilio room SID/name or tokens) -----------------------------------

async function computeQueuePosition(session) {
  if (session.status !== 'queued') return null;
  const ahead = await VideoSession.countDocuments({
    doctorId: session.doctorId,
    status: 'queued',
    $or: [{ queuedAt: { $lt: session.queuedAt } }, { queuedAt: session.queuedAt, _id: { $lt: session._id } }],
  });
  const occupied = await VideoSession.findOne({
    doctorId: session.doctorId,
    status: { $in: VideoSession.OCCUPYING_STATUSES },
  });
  return ahead + (occupied ? 1 : 0) + 1;
}

async function buildPatientView(session) {
  const consultation = await Consultation.findById(session.consultationId).select('chiefComplaint');
  const position = session.status === 'queued' ? await computeQueuePosition(session) : null;
  const waitMinutes =
    session.status === 'queued' && position != null ? (position - 1) * env.videoDefaultSessionMinutes : 0;

  return {
    _id: session._id,
    consultationId: session.consultationId,
    status: session.status,
    queuePosition: position,
    estimatedWaitMinutes: session.status === 'queued' ? waitMinutes : 0,
    readyAt: session.readyAt,
    expiresAt: session.status === 'ready' ? session.expiresAt : null,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    doctorJoinedAt: session.doctorJoinedAt,
    patientJoinedAt: session.patientJoinedAt,
    noShowReason: session.noShowReason,
    failureReason: session.failureReason,
    referenceCode: consultation ? consultationReferenceCode(consultation) : null,
    chiefComplaint: consultation?.chiefComplaint || null,
  };
}

async function getSessionForPatient(sessionId, patientId) {
  const session = await VideoSession.findById(sessionId);
  if (!session) throw new ApiError(404, 'Video session not found');
  assertOwnership(session, { role: 'patient', user: { _id: patientId } });

  await touchAndMaybePromote(session);
  const fresh = await VideoSession.findById(sessionId);
  return buildPatientView(fresh);
}

async function getMyLatestSession(patientId) {
  const session = await VideoSession.findOne({ patientId }).sort({ createdAt: -1 });
  if (!session) return null;

  await touchAndMaybePromote(session);
  const fresh = await VideoSession.findById(session._id);
  return buildPatientView(fresh);
}

async function getDoctorQueueView(doctorId) {
  // Promotion is otherwise only triggered by specific events (payment, end, cancel, no-show,
  // expiry) — none of which fire when the doctor simply re-enables availability after a pause.
  // Trying it defensively here means the queue self-heals the moment the doctor's dashboard
  // polls again; it's a safe no-op whenever there's nothing to promote.
  await promoteNextIfFree(doctorId);

  const [active, queued] = await Promise.all([
    VideoSession.findOne({ doctorId, status: { $in: VideoSession.OCCUPYING_STATUSES } })
      .populate('patientId', 'name phone')
      .populate('consultationId', 'chiefComplaint'),
    VideoSession.find({ doctorId, status: 'queued' })
      .sort({ queuedAt: 1, _id: 1 })
      .populate('patientId', 'name phone')
      .populate('consultationId', 'chiefComplaint'),
  ]);

  const queue = queued.map((s, i) => ({
    _id: s._id,
    patientName: s.patientId?.name || 'Patient',
    complaint: s.consultationId?.chiefComplaint || '',
    queuedAt: s.queuedAt,
    position: i + 1 + (active ? 1 : 0),
    estimatedWaitMinutes: (i + (active ? 1 : 0)) * env.videoDefaultSessionMinutes,
  }));

  return {
    active: active
      ? {
          _id: active._id,
          status: active.status,
          patientName: active.patientId?.name || 'Patient',
          patientPhone: active.patientId?.phone || null,
          complaint: active.consultationId?.chiefComplaint || '',
          readyAt: active.readyAt,
          expiresAt: active.expiresAt,
          startedAt: active.startedAt,
          doctorJoinedAt: active.doctorJoinedAt,
          patientJoinedAt: active.patientJoinedAt,
        }
      : null,
    queue,
  };
}

// --- Token issuance / join / lifecycle ------------------------------------------------------

async function issueToken(sessionId, requester) {
  const session = await VideoSession.findById(sessionId);
  if (!session) throw new ApiError(404, 'Video session not found');
  assertOwnership(session, requester);

  await touchAndMaybePromote(session);
  const fresh = await VideoSession.findById(sessionId);
  if (!VideoSession.OCCUPYING_STATUSES.includes(fresh.status)) {
    throw new ApiError(409, 'This video session is not currently joinable');
  }

  if (!fresh.twilioRoomSid) {
    const roomName = twilioProvider.roomNameFor(fresh._id.toString());
    const room = await twilioProvider.createRoom(roomName);
    fresh.twilioRoomSid = room.sid;
    fresh.twilioRoomName = room.uniqueName;
    await fresh.save();
    console.log('Twilio room created for session:', fresh._id.toString());
  }

  const identity = requester.role === 'doctor' ? `doctor-${requester.user._id}` : `patient-${requester.user._id}`;
  const token = twilioProvider.generateAccessToken({ identity, roomName: fresh.twilioRoomName });
  console.log('Video token issued for session:', fresh._id.toString(), 'role:', requester.role);

  return { token, roomName: fresh.twilioRoomName, identity, sessionStatus: fresh.status };
}

async function reportJoined(sessionId, requester) {
  const session = await VideoSession.findById(sessionId);
  if (!session) throw new ApiError(404, 'Video session not found');
  assertOwnership(session, requester);

  if (!VideoSession.OCCUPYING_STATUSES.includes(session.status)) {
    throw new ApiError(409, 'This video session is not currently joinable');
  }

  const now = new Date();
  if (requester.role === 'doctor' && !session.doctorJoinedAt) {
    session.doctorJoinedAt = now;
    console.log('Doctor joined video session:', session._id.toString());
  }
  if (requester.role === 'patient' && !session.patientJoinedAt) {
    session.patientJoinedAt = now;
    console.log('Patient joined video session:', session._id.toString());
  }

  if (session.doctorJoinedAt && session.patientJoinedAt && session.status !== 'active') {
    session.status = 'active';
    session.startedAt = session.startedAt || now;
    console.log('VideoSession active:', session._id.toString());
  }

  await session.save();
  return buildPatientView(session);
}

async function endSession(sessionId, doctorId) {
  const session = await VideoSession.findById(sessionId);
  if (!session || session.doctorId.toString() !== doctorId.toString()) {
    throw new ApiError(404, 'Video session not found');
  }
  if (!VideoSession.OCCUPYING_STATUSES.includes(session.status)) {
    throw new ApiError(409, 'This video session is not currently active');
  }

  session.status = 'completed';
  session.endedAt = new Date();
  await session.save();
  await twilioProvider.completeRoom(session.twilioRoomSid);
  console.log('VideoSession completed by doctor:', session._id.toString());

  await promoteNextIfFree(session.doctorId);
  return session;
}

async function cancelSession(sessionId, patientId) {
  const session = await VideoSession.findById(sessionId);
  if (!session || session.patientId.toString() !== patientId.toString()) {
    throw new ApiError(404, 'Video session not found');
  }
  if (!CANCELLABLE_STATUSES.includes(session.status)) {
    throw new ApiError(409, 'This video session can no longer be cancelled');
  }

  const wasOccupying = VideoSession.OCCUPYING_STATUSES.includes(session.status);
  session.status = 'cancelled';
  session.cancelledAt = new Date();
  session.endedAt = session.cancelledAt;
  await session.save();
  await releaseDailySlot(session.dayKey);
  console.log('VideoSession cancelled by patient:', session._id.toString());

  await notifyDoctorVideoAlertSafely('cancelled');
  if (wasOccupying) await promoteNextIfFree(session.doctorId);
  return session;
}

async function markNoShow(sessionId, doctorId, reason) {
  const session = await VideoSession.findById(sessionId);
  if (!session || session.doctorId.toString() !== doctorId.toString()) {
    throw new ApiError(404, 'Video session not found');
  }
  if (!VideoSession.OCCUPYING_STATUSES.includes(session.status)) {
    throw new ApiError(409, 'This video session is not currently active');
  }

  session.status = 'no_show';
  session.endedAt = new Date();
  session.noShowReason = reason || 'Marked no-show by doctor.';
  await session.save();
  console.log('VideoSession marked no-show by doctor:', session._id.toString());

  await notifyDoctorVideoAlertSafely('no_show');
  await promoteNextIfFree(session.doctorId);
  return session;
}

module.exports = {
  dayKeyFor,
  getAvailability,
  assertBookableForOrder,
  createSessionAfterPayment,
  promoteNextIfFree,
  getSessionForPatient,
  getMyLatestSession,
  getDoctorQueueView,
  issueToken,
  reportJoined,
  endSession,
  cancelSession,
  markNoShow,
  __setTwilioProviderForTests,
};
