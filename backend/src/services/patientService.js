const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');

async function getOwnProfile(patientId) {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }
  return patient;
}

async function updateOwnProfile(patientId, updates) {
  const patient = await Patient.findByIdAndUpdate(patientId, updates, {
    new: true,
    runValidators: true,
  });
  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }
  return patient;
}

module.exports = { getOwnProfile, updateOwnProfile };
