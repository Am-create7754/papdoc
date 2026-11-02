// Env vars must be set before any src module is required, since config/env.js reads
// process.env once at module-load time. The daily cap is deliberately generous here — the
// two tests that specifically exercise the cap override env.videoMaxDailyConsultations
// in-process for their own duration, since it's a plain mutable object.
process.env.VIDEO_MAX_DAILY_CONSULTATIONS = '10';
process.env.VIDEO_DEFAULT_SESSION_MINUTES = '10';
process.env.VIDEO_DOCTOR_JOIN_GRACE_MINUTES = '3';
process.env.VIDEO_PATIENT_JOIN_TIMEOUT_MINUTES = '5';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const VideoSession = require('../src/models/VideoSession');
const VideoDailyCounter = require('../src/models/VideoDailyCounter');
const videoService = require('../src/services/videoService');
const ApiError = require('../src/utils/ApiError');
const { env } = require('../src/config/env');

async function withDailyCap(cap, fn) {
  const original = env.videoMaxDailyConsultations;
  env.videoMaxDailyConsultations = cap;
  try {
    await fn();
  } finally {
    env.videoMaxDailyConsultations = original;
  }
}

let mongod;
let roomCounter = 0;

// A fake video provider — real Daily calls are never made in tests, per the requirement
// that external provider calls be mockable.
const fakeVideoProvider = {
  roomNameFor: (sessionId) => `test-room-${sessionId}`,
  createRoom: async (uniqueName) => ({ sid: `RM_fake_${++roomCounter}`, uniqueName, url: `https://fake.daily.co/${uniqueName}` }),
  completeRoom: async () => {},
  generateAccessToken: ({ identity, roomName }) => `fake-jwt.${identity}.${roomName}`,
};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  videoService.__setVideoProviderForTests(fakeVideoProvider);
  // Ensure the partial unique index (the one-active-session-per-doctor invariant) is actually
  // built before any test relies on it — index creation happens in the background otherwise.
  await VideoSession.init();
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test.beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});

async function makeDoctor(overrides = {}) {
  return Doctor.create({
    fullName: 'Dr. Test',
    email: `doctor-${new mongoose.Types.ObjectId()}@test.com`,
    passwordHash: 'x',
    videoConsultationFee: 500,
    videoConsultationEnabled: true,
    ...overrides,
  });
}

async function makePatient(name = 'Patient') {
  return Patient.create({
    name,
    email: `patient-${new mongoose.Types.ObjectId()}@test.com`,
    phone: '9999999999',
    passwordHash: 'x',
  });
}

async function makePaidVideoConsultation(doctor, patient) {
  return Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Fever and cough for 3 days',
    symptoms: ['fever', 'cough'],
    duration: '3 days',
    consultationType: 'video',
    paymentStatus: 'paid',
    paymentAmount: doctor.videoConsultationFee,
    paidAt: new Date(),
  });
}

test('first paid video consultation is queued then auto-promoted to ready', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await makePaidVideoConsultation(doctor, patient);

  const session = await videoService.createSessionAfterPayment(consultation);
  const fresh = await VideoSession.findById(session._id);

  assert.equal(fresh.status, 'ready');
  assert.ok(fresh.readyAt);
  assert.ok(fresh.expiresAt);
});

test('second patient waits in queue while the first is ready/active', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));
  const sessionB = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientB));

  assert.equal((await VideoSession.findById(sessionA._id)).status, 'ready');
  assert.equal((await VideoSession.findById(sessionB._id)).status, 'queued');

  const viewB = await videoService.getSessionForPatient(sessionB._id, patientB._id);
  assert.equal(viewB.queuePosition, 2);
  assert.equal(viewB.estimatedWaitMinutes, 10);
});

test('queue promotion is FIFO', async () => {
  const doctor = await makeDoctor();
  const patients = await Promise.all([makePatient('A'), makePatient('B'), makePatient('C')]);
  const sessions = [];
  for (const p of patients) {
    sessions.push(await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, p)));
  }

  assert.equal((await VideoSession.findById(sessions[0]._id)).status, 'ready');

  await videoService.endSession(sessions[0]._id, doctor._id);
  assert.equal((await VideoSession.findById(sessions[1]._id)).status, 'ready');
  assert.equal((await VideoSession.findById(sessions[2]._id)).status, 'queued');

  await videoService.endSession(sessions[1]._id, doctor._id);
  assert.equal((await VideoSession.findById(sessions[2]._id)).status, 'ready');
});

test('daily cap of N is enforced and the (N+1)th booking fails cleanly', async () => {
  await withDailyCap(2, async () => {
    const doctor = await makeDoctor();
    const patients = await Promise.all([makePatient('A'), makePatient('B'), makePatient('C')]);

    const s1 = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patients[0]));
    const s2 = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patients[1]));
    const s3 = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patients[2]));

    assert.notEqual(s1.status, 'failed');
    assert.notEqual(s2.status, 'failed');
    assert.equal(s3.status, 'failed'); // 11th-equivalent — cap is 2 for this test

    const counter = await VideoDailyCounter.findOne({ dayKey: videoService.dayKeyFor() });
    assert.equal(counter.count, 2); // the failed 3rd booking never incremented the counter
  });
});

test('daily cap holds under concurrent bookings for the last slot', async () => {
  await withDailyCap(2, async () => {
    const doctor = await makeDoctor();
    const patients = await Promise.all([makePatient('A'), makePatient('B'), makePatient('C'), makePatient('D')]);
    const consultations = await Promise.all(patients.map((p) => makePaidVideoConsultation(doctor, p)));

    const results = await Promise.all(consultations.map((c) => videoService.createSessionAfterPayment(c)));
    const accepted = results.filter((r) => r.status !== 'failed');
    const rejected = results.filter((r) => r.status === 'failed');

    assert.equal(accepted.length, 2); // cap is 2
    assert.equal(rejected.length, 2);
  });
});

test('patient cancellation releases the queue slot, capacity, and promotes the next patient', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));
  const sessionB = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientB));

  assert.equal((await VideoSession.findById(sessionA._id)).status, 'ready');

  await videoService.cancelSession(sessionA._id, patientA._id);

  const freshA = await VideoSession.findById(sessionA._id);
  const freshB = await VideoSession.findById(sessionB._id);
  assert.equal(freshA.status, 'cancelled');
  assert.equal(freshB.status, 'ready'); // B was promoted into the freed slot

  const counter = await VideoDailyCounter.findOne({ dayKey: videoService.dayKeyFor() });
  assert.equal(counter.count, 1); // cancellation released A's capacity, B still holds one
});

test('doctor marking no-show does not release daily capacity and promotes the next patient', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));
  const sessionB = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientB));

  const counterBefore = await VideoDailyCounter.findOne({ dayKey: videoService.dayKeyFor() });
  assert.equal(counterBefore.count, 2);

  await videoService.markNoShow(sessionA._id, doctor._id, 'Did not join');

  const freshA = await VideoSession.findById(sessionA._id);
  const freshB = await VideoSession.findById(sessionB._id);
  assert.equal(freshA.status, 'no_show');
  assert.equal(freshB.status, 'ready');

  const counterAfter = await VideoDailyCounter.findOne({ dayKey: videoService.dayKeyFor() });
  assert.equal(counterAfter.count, 2); // unchanged — no-show does not free up the day's cap
});

test('doctor pausing video availability blocks new bookings and stops auto-promotion', async () => {
  const doctor = await makeDoctor({ videoConsultationEnabled: false });
  const patient = await makePatient();
  const consultation = await makePaidVideoConsultation(doctor, patient);

  const session = await videoService.createSessionAfterPayment(consultation);
  assert.equal(session.status, 'failed');

  const availability = await videoService.getAvailability();
  assert.equal(availability.doctorAvailable, false);
});

test('only one video session can occupy the ready/active slot for a doctor', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');
  const dayKey = videoService.dayKeyFor();

  const sessionA = await VideoSession.create({
    consultationId: (await makePaidVideoConsultation(doctor, patientA))._id,
    patientId: patientA._id,
    doctorId: doctor._id,
    status: 'ready',
    dayKey,
    requestedAt: new Date(),
    queuedAt: new Date(),
  });

  const sessionBDoc = new VideoSession({
    consultationId: (await makePaidVideoConsultation(doctor, patientB))._id,
    patientId: patientB._id,
    doctorId: doctor._id,
    status: 'ready', // attempting to occupy the same doctor's slot while A already holds it
    dayKey,
    requestedAt: new Date(),
    queuedAt: new Date(),
  });

  await assert.rejects(() => sessionBDoc.save(), (err) => err.code === 11000);
  assert.ok(sessionA._id); // sanity: the first one saved fine
});

test('an unauthorized patient cannot request a token for another patient\'s session', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');
  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));

  await assert.rejects(
    () => videoService.issueToken(sessionA._id, { role: 'patient', user: { _id: patientB._id } }),
    (err) => err instanceof ApiError && err.statusCode === 403
  );
});

test('token issuance succeeds for the correct doctor and patient, scoped to the same room', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const session = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patient));

  const patientToken = await videoService.issueToken(session._id, { role: 'patient', user: { _id: patient._id } });
  const doctorToken = await videoService.issueToken(session._id, { role: 'doctor', user: { _id: doctor._id } });

  assert.equal(patientToken.roomName, doctorToken.roomName);
  assert.notEqual(patientToken.identity, doctorToken.identity);
  assert.ok(patientToken.token.includes(patientToken.roomName));
});

test('session becomes active only once both doctor and patient have joined, and completion promotes the next patient', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));
  const sessionB = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientB));

  await videoService.reportJoined(sessionA._id, { role: 'patient', user: { _id: patientA._id } });
  assert.equal((await VideoSession.findById(sessionA._id)).status, 'ready'); // only one side joined so far

  await videoService.reportJoined(sessionA._id, { role: 'doctor', user: { _id: doctor._id } });
  const activeA = await VideoSession.findById(sessionA._id);
  assert.equal(activeA.status, 'active');
  assert.ok(activeA.startedAt);

  await videoService.endSession(sessionA._id, doctor._id);
  const completedA = await VideoSession.findById(sessionA._id);
  assert.equal(completedA.status, 'completed');
  assert.ok(completedA.endedAt);
  assert.equal((await VideoSession.findById(sessionB._id)).status, 'ready');
});

test('a stale ready session past its join deadline expires and promotes the next patient on read', async () => {
  const doctor = await makeDoctor();
  const patientA = await makePatient('A');
  const patientB = await makePatient('B');

  const sessionA = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientA));
  const sessionB = await videoService.createSessionAfterPayment(await makePaidVideoConsultation(doctor, patientB));

  // Simulate the join window having passed — this is exactly the state a restarted backend
  // would see, since expiry is derived purely from the persisted expiresAt, not a live timer.
  await VideoSession.updateOne({ _id: sessionA._id }, { expiresAt: new Date(Date.now() - 60000) });

  const view = await videoService.getSessionForPatient(sessionA._id, patientA._id);
  assert.equal(view.status, 'expired');
  assert.equal((await VideoSession.findById(sessionB._id)).status, 'ready');
});
