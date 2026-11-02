const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { env } = require('../config/env');

const SALT_ROUNDS = 12;

const googleClient = new OAuth2Client();

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

  // Accounts created through Google have no password to compare against.
  const isMatch = patient.passwordHash ? await bcrypt.compare(password, patient.passwordHash) : false;
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return buildTokens(patient, 'patient');
}

async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) {
    throw new ApiError(503, 'Google sign-in is not configured');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google credential');
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new ApiError(401, 'Google account email is not verified');
  }
  return payload;
}

// Signs in with a Google ID token, creating the patient on first use. An existing email/password
// account with the same (Google-verified) email is linked rather than duplicated.
async function loginPatientWithGoogle({ credential }) {
  const { sub: googleId, email, name } = await verifyGoogleCredential(credential);
  const normalizedEmail = email.toLowerCase();

  let patient = await Patient.findOne({ googleId });
  if (!patient) {
    patient = await Patient.findOne({ email: normalizedEmail });
    if (patient) {
      patient.googleId = googleId;
      await patient.save();
    } else {
      patient = await Patient.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
      });
    }
  }

  if (!patient.isActive) {
    throw new ApiError(401, 'This account has been deactivated');
  }

  return { tokens: buildTokens(patient, 'patient'), patient };
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
  loginPatientWithGoogle,
  loginDoctor,
  refreshTokens,
};
