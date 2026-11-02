// Razorpay's SDK constructs its client at module-load time and throws immediately without a
// key — paymentService is only reached indirectly here (one bypass-attempt test), so a dummy
// test-mode-shaped key is enough; no real Razorpay call is ever expected to succeed in this file.
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_for_unit_tests';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_unit_tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const consultationService = require('../src/services/consultationService');
const paymentService = require('../src/services/paymentService');
const inputSafetyService = require('../src/services/consultationInputSafetyService');
const eligibilityService = require('../src/services/consultationEligibilityService');
const ApiError = require('../src/utils/ApiError');

let mongod;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test.beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
});

function dobForAge(age) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d;
}

async function makeDoctor() {
  return Doctor.create({
    fullName: 'Dr. Safety Test',
    email: `doc-${new mongoose.Types.ObjectId()}@test.com`,
    passwordHash: 'x',
    consultationFee: 400,
    priorityConsultationFee: 600,
    videoConsultationFee: 900,
    videoConsultationEnabled: true,
  });
}

async function makePatient(age) {
  return Patient.create({
    name: 'Safety Test Patient',
    email: `patient-${new mongoose.Types.ObjectId()}@test.com`,
    phone: '9999999999',
    passwordHash: 'x',
    dateOfBirth: dobForAge(age),
  });
}

const baseData = {
  symptoms: ['discomfort'],
  duration: '2 days',
};

// --- 1 & 5: input safety unit-level checks -------------------------------------------------

test('abusive complaint text is rejected', () => {
  const result = inputSafetyService.checkComplaintText('You are a fucking useless doctor, I hate you bitch');
  assert.equal(result.accepted, false);
  assert.ok(['PROFANITY_DETECTED', 'THREAT_DETECTED', 'HARASSMENT_DETECTED'].includes(result.reasonCode));
});

test('threatening complaint text is rejected', () => {
  const result = inputSafetyService.checkComplaintText('I will kill you if you do not see me now');
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'THREAT_DETECTED');
});

test('meaningless / spam input is rejected', () => {
  assert.equal(inputSafetyService.checkComplaintText('asdkjfhgkjshdfgkjhsdfg').accepted, false);
  assert.equal(inputSafetyService.checkComplaintText('aaaaaaaaaaaaaaa').accepted, false);
  assert.equal(inputSafetyService.checkComplaintText('!!!????....').accepted, false);
});

test('legitimate medical and anatomical language is accepted, never mistaken for profanity', () => {
  const legitimatePhrases = [
    'I have pain in my vagina and unusual discharge for 3 days',
    'There is blood in my stool since yesterday',
    'I have been experiencing erectile dysfunction for two weeks',
    'Burning sensation while urinating and lower abdominal pain',
    'I feel very anxious and depressed most days, having trouble sleeping',
    'A deep cut on my leg from a fall, it will not stop bleeding lightly',
    'Pain and swelling in my testicles since this morning',
    'Irregular periods and heavy menstrual bleeding this month',
  ];
  for (const phrase of legitimatePhrases) {
    const result = inputSafetyService.checkComplaintText(phrase);
    assert.equal(result.accepted, true, `expected to accept: "${phrase}"`);
  }
});

// --- 6-9: eligibility unit-level checks -----------------------------------------------------

test('confidently low-acuity concern for an adult restricts video', () => {
  const result = eligibilityService.checkVideoEligibility({
    dateOfBirth: dobForAge(30),
    chiefComplaint: 'I just have a mild cold and runny nose, wanted a prescription refill',
    symptoms: ['runny nose'],
    duration: '2 days',
  });
  assert.equal(result.videoEligible, false);
  assert.equal(result.reasonCode, 'LOW_ACUITY_NO_RED_FLAGS');
});

test('same low-acuity wording for a child under 10 keeps video available (age exception)', () => {
  const result = eligibilityService.checkVideoEligibility({
    dateOfBirth: dobForAge(6),
    chiefComplaint: 'My child just has a mild cold and runny nose, wanted a prescription refill',
    symptoms: ['runny nose'],
    duration: '2 days',
  });
  assert.equal(result.videoEligible, true);
  assert.equal(result.reasonCode, 'AGE_UNDER_10');
});

test('a red-flag symptom keeps video available even for an adult, and even alongside mild wording', () => {
  const result = eligibilityService.checkVideoEligibility({
    dateOfBirth: dobForAge(40),
    chiefComplaint: 'I had a mild cold, but now I suddenly have severe chest pain and difficulty breathing',
    symptoms: ['chest pain'],
    duration: 'started 1 hour ago',
  });
  assert.equal(result.videoEligible, true);
  assert.equal(result.reasonCode, 'RED_FLAG_PRESENT');
});

test('a bare, unqualified symptom is never assumed low-acuity — uncertainty keeps video available', () => {
  // Critical safety rule: "headache"/"fever"/"cough" alone must never trigger low-acuity routing.
  const bareSymptomPhrases = [
    'I have a headache',
    'I have had a fever since this morning',
    'I have a persistent cough',
    'My stomach hurts',
  ];
  for (const phrase of bareSymptomPhrases) {
    const result = eligibilityService.checkVideoEligibility({
      dateOfBirth: dobForAge(28),
      chiefComplaint: phrase,
      symptoms: [],
      duration: '1 day',
    });
    assert.equal(result.videoEligible, true, `expected video to remain available for: "${phrase}"`);
    assert.equal(result.reasonCode, 'UNCERTAIN');
  }
});

// --- 2, 6, 10, 12: end-to-end enforcement via consultationService/paymentService -----------

test('a rejected complaint never creates a consultation record (never reaches doctor/WhatsApp)', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(30);

  await assert.rejects(
    () =>
      consultationService.createConsultation(patient, {
        ...baseData,
        chiefComplaint: 'You are a fucking useless bitch of a doctor',
        consultationType: 'standard',
      }),
    (err) => err instanceof ApiError && err.statusCode === 422
  );

  assert.equal(await Consultation.countDocuments(), 0);
});

test('video consultation type is rejected server-side for a confidently low-acuity adult case', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(25);

  await assert.rejects(
    () =>
      consultationService.createConsultation(patient, {
        chiefComplaint: 'Just a mild cold and sore throat, wanted a routine follow-up',
        symptoms: ['sore throat'],
        duration: '2 days',
        consultationType: 'video',
      }),
    (err) => err instanceof ApiError && err.statusCode === 422
  );

  assert.equal(await Consultation.countDocuments(), 0);
});

test('the same low-acuity concern is still accepted as a standard consultation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(25);

  const consultation = await consultationService.createConsultation(patient, {
    chiefComplaint: 'Just a mild cold and sore throat, wanted a routine follow-up',
    symptoms: ['sore throat'],
    duration: '2 days',
    consultationType: 'standard',
  });

  assert.ok(consultation._id);
  assert.equal(consultation.consultationType, 'standard');
  assert.equal(consultation.videoEligible, false); // recorded, but not enforced for non-video types
  assert.equal(consultation.videoEligibilityReasonCode, 'LOW_ACUITY_NO_RED_FLAGS');
});

test('the same low-acuity concern is still accepted as a priority consultation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(25);

  const consultation = await consultationService.createConsultation(patient, {
    chiefComplaint: 'Just a mild cold and sore throat, wanted a routine follow-up',
    symptoms: ['sore throat'],
    duration: '2 days',
    consultationType: 'priority',
  });

  assert.equal(consultation.consultationType, 'priority');
});

test('a patient cannot bypass the video restriction by calling order creation directly on a rejected consultation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(25);

  // Simulates a consultation that was already correctly flagged ineligible at creation time —
  // proves the order-creation layer independently enforces the stored decision too.
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Mild cold, routine follow-up',
    symptoms: ['cold'],
    duration: '2 days',
    consultationType: 'video',
    status: 'submitted',
    paymentStatus: 'unpaid',
    videoEligible: false,
    videoEligibilityReasonCode: 'LOW_ACUITY_NO_RED_FLAGS',
  });

  await assert.rejects(
    () => paymentService.createOrder(patient, consultation._id),
    (err) => err instanceof ApiError && err.statusCode === 409
  );
});

test('video order creation proceeds past the eligibility gate for an eligible consultation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient(25);

  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Sudden severe chest pain and difficulty breathing',
    symptoms: ['chest pain'],
    duration: 'started today',
    consultationType: 'video',
    status: 'submitted',
    paymentStatus: 'unpaid',
    videoEligible: true,
    videoEligibilityReasonCode: 'RED_FLAG_PRESENT',
  });

  // Razorpay itself isn't reachable/mocked in this unit test, so we only assert that execution
  // gets past our eligibility gate (409) — any error here must NOT be the eligibility rejection.
  await assert.rejects(
    () => paymentService.createOrder(patient, consultation._id),
    (err) => !(err instanceof ApiError) || err.statusCode !== 409
  );
});

// --- precheck endpoint-backing function -----------------------------------------------------

test('precheckConsultationInput returns the combined shape the wizard needs', async () => {
  const patient = await makePatient(25);

  const rejected = await consultationService.precheckConsultationInput(patient, {
    chiefComplaint: 'fuck this app',
  });
  assert.equal(rejected.inputAccepted, false);
  assert.ok(rejected.message);

  const eligible = await consultationService.precheckConsultationInput(patient, {
    chiefComplaint: 'I have a mild cold, prescription refill please',
    symptoms: 'cold',
    duration: '2 days',
  });
  assert.equal(eligible.inputAccepted, true);
  assert.equal(eligible.videoEligible, false);
  assert.equal(eligible.reasonCode, 'LOW_ACUITY_NO_RED_FLAGS');
});
