// Image-header consultation alerts (META_WHATSAPP_IMAGE_HEADER=true). Env vars must be set before
// any src module is required, since config/env.js reads process.env once at module-load time.
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_for_unit_tests';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_for_unit_tests';
process.env.META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || 'dummy_meta_token';
process.env.META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '1234567890';
process.env.DOCTOR_WHATSAPP_NUMBER = process.env.DOCTOR_WHATSAPP_NUMBER || '+911234567890';
process.env.META_WHATSAPP_CONSULTATION_TEMPLATE = 'new_consultation_alert';
process.env.META_WHATSAPP_PRIORITY_ALERT_TEMPLATE = 'priority_consultation_alert';
process.env.META_WHATSAPP_IMAGE_HEADER = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Doctor = require('../src/models/Doctor');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const whatsappService = require('../src/services/whatsappService');
const { UPLOAD_DIR } = require('../src/middlewares/upload');

let mongod;
const originalFetch = global.fetch;
const createdFiles = [];
let messageCalls;
let mediaUploads;
let rejectImageHeader;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  global.fetch = originalFetch;
  for (const file of createdFiles) fs.rmSync(file, { force: true });
});

test.beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
  whatsappService.__resetMediaCacheForTests();

  messageCalls = [];
  mediaUploads = [];
  rejectImageHeader = false;
  let counter = 0;
  global.fetch = async (url, options) => {
    if (url.endsWith('/media')) {
      const file = options.body.get('file');
      mediaUploads.push({ type: options.body.get('type'), name: file.name, size: file.size });
      return { ok: true, json: async () => ({ id: `media.fake_${++counter}` }) };
    }
    const body = JSON.parse(options.body);
    messageCalls.push(body);
    const hasHeader = body.template?.components?.some((c) => c.type === 'header');
    if (rejectImageHeader && hasHeader) {
      return { ok: false, status: 400, json: async () => ({ error: { message: 'Number of parameters does not match' } }) };
    }
    return { ok: true, json: async () => ({ messages: [{ id: `wamid.fake_${++counter}` }] }) };
  };
});

async function makeConsultation(overrides = {}) {
  const doctor = await Doctor.create({
    fullName: 'Dr. Image Test',
    email: `doc-${new mongoose.Types.ObjectId()}@test.com`,
    passwordHash: 'x',
  });
  const patient = await Patient.create({
    name: 'Image Test Patient',
    email: `patient-${new mongoose.Types.ObjectId()}@test.com`,
    phone: '9999999999',
    passwordHash: 'x',
  });
  return Consultation.create({
    patientId: patient._id,
    doctorId: doctor._id,
    chiefComplaint: 'Red itchy rash on the arm',
    symptoms: ['rash'],
    duration: '4 days',
    consultationType: 'standard',
    paymentStatus: 'paid',
    status: 'under_review',
    ...overrides,
  });
}

// Writes a small file into the real uploads folder, the way multer would have stored it.
function storedUpload(ext, mimeType, bytes) {
  const filename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, bytes);
  createdFiles.push(filePath);
  return { filename, originalName: `photo${ext}`, mimeType, size: bytes.length };
}

function headerImageId(call) {
  return call.template.components.find((c) => c.type === 'header')?.parameters?.[0]?.image?.id;
}

test("the patient's photo is uploaded and becomes the alert's image header", async () => {
  const photo = storedUpload('.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
  const consultation = await makeConsultation({ attachments: [photo] });

  await whatsappService.sendConsultationToDoctor(consultation);

  assert.equal(mediaUploads.length, 1);
  assert.equal(mediaUploads[0].type, 'image/jpeg');
  assert.equal(mediaUploads[0].name, photo.filename);
  assert.equal(messageCalls.length, 1);
  assert.equal(headerImageId(messageCalls[0]), 'media.fake_1');

  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.whatsappMessageId); // still the reply -> prescription key
});

test('without a photo, the default image is used — and uploaded only once', async () => {
  const first = await makeConsultation();
  const second = await makeConsultation();

  await whatsappService.sendConsultationToDoctor(first);
  await whatsappService.sendConsultationToDoctor(second);

  assert.equal(mediaUploads.length, 1);
  assert.equal(mediaUploads[0].name, 'whatsapp-no-photo.jpg');
  assert.equal(headerImageId(messageCalls[0]), headerImageId(messageCalls[1]));
});

test('a WEBP or PDF attachment falls back to the default image (WhatsApp headers need JPG/PNG)', async () => {
  const webp = storedUpload('.webp', 'image/webp', Buffer.from('RIFF0000WEBP'));
  const pdf = storedUpload('.pdf', 'application/pdf', Buffer.from('%PDF-1.4'));
  const consultation = await makeConsultation({ attachments: [webp, pdf] });

  await whatsappService.sendConsultationToDoctor(consultation);

  assert.equal(mediaUploads.length, 1);
  assert.equal(mediaUploads[0].name, 'whatsapp-no-photo.jpg');
});

test('if Meta rejects the image header, the alert is resent without it', async () => {
  rejectImageHeader = true;
  const consultation = await makeConsultation();

  await whatsappService.sendConsultationToDoctor(consultation);

  assert.equal(messageCalls.length, 2);
  assert.ok(headerImageId(messageCalls[0]));
  assert.equal(headerImageId(messageCalls[1]), undefined);
  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.whatsappMessageId);
});

test('priority consultations use the 🔴 template with the image header too', async () => {
  const photo = storedUpload('.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const consultation = await makeConsultation({ consultationType: 'priority', attachments: [photo] });

  await whatsappService.sendConsultationToDoctor(consultation);

  assert.equal(messageCalls.length, 1);
  assert.equal(messageCalls[0].template.name, 'priority_consultation_alert');
  assert.equal(mediaUploads[0].type, 'image/png');
  assert.ok(headerImageId(messageCalls[0]));
});

test('the 🔵 video alert carries the image header too, and still never sets the reply key', async () => {
  process.env.META_WHATSAPP_VIDEO_ALERT_TEMPLATE = 'video_consultation_alert';
  const photo = storedUpload('.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]));
  const consultation = await makeConsultation({ consultationType: 'video', attachments: [photo] });
  const patient = await Patient.findById(consultation.patientId);

  await whatsappService.sendVideoConsultationAlert(consultation, patient, 1);

  assert.equal(messageCalls.length, 1);
  assert.equal(messageCalls[0].template.components.find((c) => c.type === 'button'), undefined); // static button lives in Meta
  assert.equal(mediaUploads[0].name, photo.filename);
  assert.ok(headerImageId(messageCalls[0]));
  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.videoAlertMessageId);
  assert.equal(fresh.whatsappMessageId, undefined);
});

test('a video alert falls back to text-only if Meta rejects its image header', async () => {
  rejectImageHeader = true;
  const consultation = await makeConsultation({ consultationType: 'video' });
  const patient = await Patient.findById(consultation.patientId);

  await whatsappService.sendVideoConsultationAlert(consultation, patient, 2);

  assert.equal(messageCalls.length, 2);
  assert.equal(headerImageId(messageCalls[1]), undefined);
  const fresh = await Consultation.findById(consultation._id);
  assert.ok(fresh.videoAlertMessageId);
});
