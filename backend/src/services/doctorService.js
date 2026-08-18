const fs = require('fs');
const path = require('path');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { SIGNATURE_DIR } = require('../middlewares/signatureUpload');

// A stored signatureImage value is either a bare filename (internally uploaded) or a full URL (legacy/external).
function isInternalFilename(value) {
  return !!value && !/^https?:\/\//i.test(value);
}

const PUBLIC_FIELDS =
  'fullName profilePhoto specialization qualifications medicalRegistrationNumber ' +
  'yearsOfExperience areasOfExpertise commonlyTreatedConditions clinicName clinicAddress ' +
  'city languages professionalAchievements bio consultationFee priorityConsultationFee ' +
  'videoConsultationFee videoConsultationEnabled';

async function getOwnProfile(doctorId) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }
  return doctor;
}

async function updateOwnProfile(doctorId, updates) {
  const doctor = await Doctor.findByIdAndUpdate(doctorId, updates, {
    new: true,
    runValidators: true,
  });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }
  return doctor;
}

async function getPublicProfile() {
  const doctor = await Doctor.findOne({ isActive: true }).select(PUBLIC_FIELDS);
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not available');
  }
  return doctor;
}

async function updateOwnSignature(doctorId, file) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const previousFilename = isInternalFilename(doctor.signatureImage) ? doctor.signatureImage : null;

  doctor.signatureImage = file.filename;
  await doctor.save();

  if (previousFilename) {
    const oldPath = path.join(SIGNATURE_DIR, previousFilename);
    fs.unlink(oldPath, () => {}); // best-effort cleanup, ignore errors
  }

  return doctor;
}

module.exports = { getOwnProfile, updateOwnProfile, getPublicProfile, updateOwnSignature };
