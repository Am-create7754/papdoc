// Meta credentials must be present (dummy values) for whatsappService to actually attempt a
// send instead of silently skipping — global.fetch is stubbed in beforeEach to fake the Graph
// API response, mirroring the RAZORPAY dummy-key pattern used by the other test files (env vars
// must be set before any src module is required, since config/env.js reads process.env once at
// module-load time).
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_for_unit_tests';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_unit_tests';
process.env.META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || 'dummy_meta_token';
process.env.META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '1234567890';
process.env.DOCTOR_WHATSAPP_NUMBER = process.env.DOCTOR_WHATSAPP_NUMBER || '+911234567890';
process.env.META_WHATSAPP_CONSULTATION_TEMPLATE = process.env.META_WHATSAPP_CONSULTATION_TEMPLATE || 'new_consultation_alert';
process.env.META_WHATSAPP_VIDEO_ALERT_TEMPLATE = process.env.META_WHATSAPP_VIDEO_ALERT_TEMPLATE || 'video_consultation_alert';
process.env.META_WHATSAPP_PRIORITY_ALERT_TEMPLATE =
  process.env.META_WHATSAPP_PRIORITY_ALERT_TEMPLATE || 'priority_consultation_alert';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const VideoSession = require('../src/models/VideoSession');
const videoService = require('../src/services/videoService');
const paymentService = require('../src/services/paymentService');
const whatsappService = require('../src/services/whatsappService');

let mongod;
let roomCounter = 0;
const fakeVideoProvider = {
  roomNameFor: (id) => `test-room-${id}`,
  createRoom: async (uniqueName) => ({ sid: `RM_fake_${++roomCounter}`, uniqueName, url: `https://fake.daily.co/${uniqueName}` }),
  completeRoom: async () => {},
  generateAccessToken: () => 'fake-jwt',
};

const originalFetch = global.fetch;
let fetchCalls;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  videoService.__setVideoProviderForTests(fakeVideoProvider);
  await VideoSession.init();
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  global.fetch = originalFetch;
});

test.beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});

  fetchCalls = [];
  let wamidCounter = 0;
  global.fetch = async (url, options) => {
    fetchCalls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ messages: [{ id: `wamid.fake_${++wamidCounter}` }] }) };
  };
});

async function makeDoctor(overrides = {}) {
  return Doctor.create({
    fullName: 'Dr. Alert Test',
    email: `doc-${new mongoose.Types.ObjectId()}@test.com`,
    passwordHash: 'x',
    consultationFee: 400,
    priorityConsultationFee: 600,
    videoConsultationFee: 900,
    videoConsultationEnabled: true,
    ...overrides,
  });
}

async function makePatient(name = 'Alert Test Patient') {
  return Patient.create({
    name,
    email: `patient-${new mongoose.Types.ObjectId()}@test.com`,
    phone: '9999999999',
    passwordHash: 'x',
  });
}

function templateNamesSent() {
  return fetchCalls.map((c) => c.body?.template?.name).filter(Boolean);
}

// --- 2, 3, 6: paid video consultation ---------------------------------------------------------

test('a paid video consultation sends exactly one 🔵 video alert, with no video room secret in it', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
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

  await videoService.createSessionAfterPayment(consultation);

  const videoAlerts = fetchCalls.filter((c) => c.body?.template?.name === 'video_consultation_alert');
  assert.equal(videoAlerts.length, 1);

  const body = videoAlerts[0].body;
  const bodyParams = body.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
  assert.equal(bodyParams[0], patient.name);
  assert.equal(bodyParams[1], consultation.chiefComplaint);
  assert.equal(bodyParams[2], '1');
  assert.ok(bodyParams[3].startsWith('HF-'));

  const serialized = JSON.stringify(body);
  assert.ok(!/daily\.co/i.test(serialized), 'video alert must never leak the room url');
  assert.ok(!serialized.includes('RM_fake'), 'video alert must never leak the room id');
  assert.ok(!/fake-jwt/.test(serialized), 'video alert must never leak an access token');

  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.videoAlertMessageId);
  assert.equal(fresh.whatsappMessageId, undefined); // never touches the prescription-correlation field
});

test('normal (standard) consultation payment does not send a video or priority alert', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Sore throat for 2 days',
    symptoms: ['sore throat'],
    duration: '2 days',
    consultationType: 'standard',
    razorpayOrderId: 'order_std_test_1',
  });

  await paymentService.reconcileFromWebhook('order_std_test_1', 'pay_std_test_1');

  assert.deepEqual(templateNamesSent(), ['new_consultation_alert']);
});

// --- 7, 8: priority alert ----------------------------------------------------------------------

test('a paid priority consultation sends ONE 🔴 priority alert, and it is the reply-able message', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Severe abdominal pain since morning',
    symptoms: ['abdominal pain'],
    duration: '5 hours',
    consultationType: 'priority',
    razorpayOrderId: 'order_priority_test_1',
  });

  await paymentService.reconcileFromWebhook('order_priority_test_1', 'pay_priority_test_1');

  assert.deepEqual(templateNamesSent(), ['priority_consultation_alert']);

  const priorityCall = fetchCalls[0].body;
  const bodyParams = priorityCall.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
  assert.equal(bodyParams[0], patient.name);
  assert.equal(bodyParams[1], consultation.chiefComplaint);
  assert.equal(bodyParams[2], consultation.duration);
  assert.ok(bodyParams[3].startsWith('HF-'));
  assert.equal(priorityCall.template.components.find((c) => c.type === 'button'), undefined); // no link button

  const serialized = JSON.stringify(priorityCall);
  assert.ok(!/daily\.co|token|secret/i.test(serialized));

  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.whatsappMessageId); // the reply -> prescription key comes from the 🔴 message
  assert.equal(fresh.priorityAlertMessageId, fresh.whatsappMessageId);
});

test('if the priority template fails, the doctor still gets the standard reply-able alert', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'High fever since last night',
    symptoms: ['fever'],
    duration: '1 day',
    consultationType: 'priority',
    razorpayOrderId: 'order_priority_fallback_1',
  });

  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    fetchCalls.push({ url, body });
    if (body.template?.name === 'priority_consultation_alert') {
      return { ok: false, status: 404, json: async () => ({ error: { message: 'Template name does not exist' } }) };
    }
    return { ok: true, json: async () => ({ messages: [{ id: 'wamid.fallback_1' }] }) };
  };

  await paymentService.reconcileFromWebhook('order_priority_fallback_1', 'pay_priority_fallback_1');

  assert.deepEqual(templateNamesSent(), ['priority_consultation_alert', 'new_consultation_alert']);
  const fresh = await Consultation.findById(consultation._id);
  assert.equal(fresh.whatsappMessageId, 'wamid.fallback_1');
});

// --- 9: idempotency ------------------------------------------------------------------------

test('a duplicate webhook/verify retry does not duplicate the video or priority alert', async () => {
  const doctor = await makeDoctor();

  const patientVideo = await makePatient('Video Retry Patient');
  const videoConsultation = await Consultation.create({
    patientId: patientVideo._id,
    doctorId: doctor._id,
    chiefComplaint: 'Persistent headache',
    symptoms: ['headache'],
    duration: '1 day',
    consultationType: 'video',
    paymentStatus: 'paid',
    paymentAmount: doctor.videoConsultationFee,
    paidAt: new Date(),
  });

  await videoService.createSessionAfterPayment(videoConsultation);
  await videoService.createSessionAfterPayment(videoConsultation); // simulates a webhook+verify race
  assert.equal(fetchCalls.filter((c) => c.body?.template?.name === 'video_consultation_alert').length, 1);

  const patientPriority = await makePatient('Priority Retry Patient');
  const priorityConsultation = await Consultation.create({
    patientId: patientPriority._id,
    doctorId: doctor._id,
    chiefComplaint: 'Severe back pain',
    symptoms: ['back pain'],
    duration: '2 days',
    consultationType: 'priority',
    razorpayOrderId: 'order_priority_retry_1',
  });

  await paymentService.reconcileFromWebhook('order_priority_retry_1', 'pay_priority_retry_1');
  await paymentService.verifyPayment(patientPriority, {
    consultationId: priorityConsultation._id,
    razorpay_order_id: 'order_priority_retry_1',
    razorpay_payment_id: 'pay_priority_retry_1',
    razorpay_signature: 'irrelevant-already-paid-path',
  });

  assert.equal(fetchCalls.filter((c) => c.body?.template?.name === 'priority_consultation_alert').length, 1);
});

// --- 10, 11: prescription-reply correlation preserved and isolated ---------------------------

test('existing WhatsApp reply -> prescription correlation still works for the normal consultation alert', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Cough and mild fever',
    symptoms: ['cough'],
    duration: '2 days',
    consultationType: 'standard',
    paymentStatus: 'paid',
    paymentAmount: 400,
    paidAt: new Date(),
    status: 'under_review',
  });

  await whatsappService.sendConsultationToDoctor(consultation);
  const afterSend = await Consultation.findById(consultation._id);
  assert.ok(afterSend.whatsappMessageId);

  await whatsappService.processDoctorReply({
    from: process.env.DOCTOR_WHATSAPP_NUMBER,
    messageId: 'wamid.doctor_reply_1',
    text: 'Take paracetamol 500mg twice daily.',
    contextId: afterSend.whatsappMessageId,
  });

  const afterReply = await Consultation.findById(consultation._id);
  assert.equal(afterReply.doctorReply, 'Take paracetamol 500mg twice daily.');
  assert.equal(afterReply.prescriptionStatus, 'generated');
});

test('replying to a video operational alert does not create an accidental prescription', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Fever and cough for 3 days',
    symptoms: ['fever'],
    duration: '3 days',
    consultationType: 'video',
    paymentStatus: 'paid',
    paymentAmount: doctor.videoConsultationFee,
    paidAt: new Date(),
  });

  await videoService.createSessionAfterPayment(consultation);
  const afterAlert = await Consultation.findById(consultation._id);
  assert.ok(afterAlert.videoAlertMessageId);
  assert.equal(afterAlert.whatsappMessageId, undefined);

  await whatsappService.processDoctorReply({
    from: process.env.DOCTOR_WHATSAPP_NUMBER,
    messageId: 'wamid.doctor_reply_to_video_alert',
    text: 'On my way',
    contextId: afterAlert.videoAlertMessageId,
  });

  const afterReply = await Consultation.findById(consultation._id);
  assert.equal(afterReply.doctorReply, undefined);
  assert.equal(afterReply.prescriptionStatus, 'none');
});

test('replying to the 🔴 priority alert creates the prescription, like the standard alert', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Severe abdominal pain since morning',
    symptoms: ['abdominal pain'],
    duration: '5 hours',
    consultationType: 'priority',
    razorpayOrderId: 'order_priority_reply_test',
  });

  await paymentService.reconcileFromWebhook('order_priority_reply_test', 'pay_priority_reply_test');
  const afterAlert = await Consultation.findById(consultation._id);
  assert.ok(afterAlert.priorityAlertMessageId);

  await whatsappService.processDoctorReply({
    from: process.env.DOCTOR_WHATSAPP_NUMBER,
    messageId: 'wamid.doctor_reply_to_priority_alert',
    text: 'Take an antacid after meals and avoid spicy food.',
    contextId: afterAlert.priorityAlertMessageId,
  });

  const afterReply = await Consultation.findById(consultation._id);
  assert.equal(afterReply.doctorReply, 'Take an antacid after meals and avoid spicy food.');
  assert.equal(afterReply.prescriptionStatus, 'generated');
});
