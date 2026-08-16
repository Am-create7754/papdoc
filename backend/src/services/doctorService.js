const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');

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

module.exports = { getOwnProfile, updateOwnProfile, getPublicProfile };
