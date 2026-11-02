const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const consultationService = require('../src/services/consultationService');
const { PRESCRIPTION_DIR } = require('../src/services/prescriptionService');
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

async function makeDoctor() {
  return Doctor.create({
    fullName: 'Dr. Manual Reply Test',
    email: `doc-${new mongoose.Types.ObjectId()}@test.com`,
    passwordHash: 'x',
    consultationFee: 400,
  });
}

async function makePatient() {
  return Patient.create({
    name: 'Manual Reply Test Patient',
    email: `patient-${new mongoose.Types.ObjectId()}@test.com`,
    phone: '9999999999',
    passwordHash: 'x',
  });
}

async function makePaidConsultation(doctor, patient) {
  return Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Manual reply fallback test complaint',
    symptoms: ['cough'],
    duration: '2 days',
    consultationType: 'standard',
    paymentStatus: 'paid',
    paymentAmount: 400,
    paidAt: new Date(),
    status: 'under_review',
  });
}

test('manual reply stores doctorReply and triggers prescription generation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await makePaidConsultation(doctor, patient);

  const updated = await consultationService.submitManualDoctorReply(
    consultation._id,
    doctor._id,
    'Take paracetamol 500mg twice daily for 3 days.'
  );

  assert.equal(updated.doctorReply, 'Take paracetamol 500mg twice daily for 3 days.');
  assert.equal(updated.status, 'completed'); // generatePrescription advances responded -> completed
  assert.ok(updated.doctorRepliedAt);
  assert.equal(updated.prescriptionStatus, 'generated');
  assert.ok(updated.prescriptionGeneratedAt);

  // prescriptionPdfFilename is stripped from the returned view (internal detail) — re-fetch
  // the raw document directly to verify the actual file was written.
  const raw = await Consultation.findById(consultation._id);
  const rawPdfPath = path.join(PRESCRIPTION_DIR, raw.prescriptionPdfFilename);
  assert.ok(fs.existsSync(rawPdfPath), 'expected generated PDF file to exist on disk');
  assert.ok(fs.statSync(rawPdfPath).size > 0, 'expected generated PDF file to be non-empty');
});

test('a second manual reply on the same consultation is rejected (idempotent, no duplicate prescription)', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await makePaidConsultation(doctor, patient);

  await consultationService.submitManualDoctorReply(consultation._id, doctor._id, 'First response.');

  await assert.rejects(
    () => consultationService.submitManualDoctorReply(consultation._id, doctor._id, 'Second response.'),
    (err) => err instanceof ApiError && err.statusCode === 409
  );

  const raw = await Consultation.findById(consultation._id);
  assert.equal(raw.doctorReply, 'First response.'); // unchanged by the rejected second attempt
});

test('manual reply is rejected for an unpaid consultation', async () => {
  const doctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Unpaid test complaint',
    symptoms: ['cough'],
    duration: '1 day',
    consultationType: 'standard',
    paymentStatus: 'unpaid',
  });

  await assert.rejects(
    () => consultationService.submitManualDoctorReply(consultation._id, doctor._id, 'Should not be allowed.'),
    (err) => err instanceof ApiError && err.statusCode === 409
  );
});

test('a different doctor cannot reply to a consultation that is not theirs', async () => {
  const doctor = await makeDoctor();
  const otherDoctor = await makeDoctor();
  const patient = await makePatient();
  const consultation = await makePaidConsultation(doctor, patient);

  await assert.rejects(
    () => consultationService.submitManualDoctorReply(consultation._id, otherDoctor._id, 'Not my patient.'),
    (err) => err instanceof ApiError && err.statusCode === 403
  );
});
