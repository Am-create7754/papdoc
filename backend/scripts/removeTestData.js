require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { env } = require('../src/config/env');
const Patient = require('../src/models/Patient');
const Consultation = require('../src/models/Consultation');
const VideoSession = require('../src/models/VideoSession');

// Removes patients whose email is on a reserved test domain, along with their consultations,
// video sessions, uploaded attachments and generated prescription PDFs. The doctor account and
// every real patient are never touched.
//
//   npm run cleanup:test-data            -> dry run: only lists what would be removed
//   npm run cleanup:test-data -- --confirm -> actually deletes it
const TEST_EMAIL_PATTERN = /@(example\.(com|org|net)|[a-z0-9-]+\.(test|example|invalid|localhost))$/i;

const UPLOADS = env.uploadsDir;
const ATTACHMENT_DIR = path.join(UPLOADS, 'consultations');
const PRESCRIPTION_DIR = path.join(UPLOADS, 'prescriptions');

function removeFile(dir, filename) {
  if (!filename) return false;
  const filePath = path.join(dir, path.basename(filename));
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

async function run() {
  const confirm = process.argv.includes('--confirm');
  await mongoose.connect(env.mongoUri);

  const patients = (await Patient.find({}, 'email name')).filter((p) => TEST_EMAIL_PATTERN.test(p.email));
  const patientIds = patients.map((p) => p._id);
  const consultations = await Consultation.find({ patientId: { $in: patientIds } });
  const videoSessionCount = await VideoSession.countDocuments({ patientId: { $in: patientIds } });
  const fileCount = consultations.reduce(
    (n, c) => n + c.attachments.length + (c.prescriptionPdfFilename ? 1 : 0) + (c.prescriptionPdfFilenameHi ? 1 : 0),
    0
  );

  console.log(`Test patients found: ${patients.length}`);
  patients.forEach((p) => console.log(`  - ${p.email} (${p.name})`));
  console.log(`Consultations: ${consultations.length}`);
  console.log(`Video sessions: ${videoSessionCount}`);
  console.log(`Files on disk (attachments + prescriptions): up to ${fileCount}`);

  if (!confirm) {
    console.log('\nDry run only — nothing was deleted. Re-run with --confirm to delete the above.');
    await mongoose.disconnect();
    return;
  }

  let filesRemoved = 0;
  for (const c of consultations) {
    for (const a of c.attachments) if (removeFile(ATTACHMENT_DIR, a.filename)) filesRemoved += 1;
    if (removeFile(PRESCRIPTION_DIR, c.prescriptionPdfFilename)) filesRemoved += 1;
    if (removeFile(PRESCRIPTION_DIR, c.prescriptionPdfFilenameHi)) filesRemoved += 1;
  }

  const video = await VideoSession.deleteMany({ patientId: { $in: patientIds } });
  const consults = await Consultation.deleteMany({ patientId: { $in: patientIds } });
  const removedPatients = await Patient.deleteMany({ _id: { $in: patientIds } });

  console.log(
    `\nDeleted ${removedPatients.deletedCount} patients, ${consults.deletedCount} consultations, ` +
      `${video.deletedCount} video sessions and ${filesRemoved} files.`
  );
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Failed to remove test data:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
