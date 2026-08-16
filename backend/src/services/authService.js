const bcrypt = require('bcrypt');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;

function buildTokens(user, role) {
  const payload = { id: user._id.toString(), role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function registerPatient({ name, email, phone, password }) {
  const existing = await Patient.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const patient = await Patient.create({ name, email, phone, passwordHash });

  return buildTokens(patient, 'patient');
}

async function loginPatient({ email, password }) {
  const patient = await Patient.findOne({ email }).select('+passwordHash');
  if (!patient || !patient.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, patient.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return buildTokens(patient, 'patient');
}

async function loginDoctor({ email, password }) {
  const doctor = await Doctor.findOne({ email }).select('+passwordHash');
  if (!doctor || !doctor.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, doctor.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return buildTokens(doctor, 'doctor');
}

async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const Model = payload.role === 'doctor' ? Doctor : payload.role === 'patient' ? Patient : null;
  if (!Model) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await Model.findById(payload.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  return buildTokens(user, payload.role);
}

module.exports = {
  registerPatient,
  loginPatient,
  loginDoctor,
  refreshTokens,
};
