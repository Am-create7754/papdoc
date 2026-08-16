const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { env } = require('../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/api/auth',
};

function sendAuthResponse(res, statusCode, tokens, user, role) {
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions);
  res.status(statusCode).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        role,
        ...(role === 'doctor'
          ? { fullName: user.fullName, email: user.email }
          : { name: user.name, email: user.email, phone: user.phone }),
      },
    },
  });
}

const registerPatient = asyncHandler(async (req, res) => {
  const tokens = await authService.registerPatient(req.body);
  const user = await Patient.findOne({ email: req.body.email });
  sendAuthResponse(res, 201, tokens, user, 'patient');
});

const loginPatient = asyncHandler(async (req, res) => {
  const tokens = await authService.loginPatient(req.body);
  const user = await Patient.findOne({ email: req.body.email });
  sendAuthResponse(res, 200, tokens, user, 'patient');
});

const loginDoctor = asyncHandler(async (req, res) => {
  const tokens = await authService.loginDoctor(req.body);
  const user = await Doctor.findOne({ email: req.body.email });
  sendAuthResponse(res, 200, tokens, user, 'doctor');
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  const tokens = await authService.refreshTokens(refreshToken);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions);
  res.status(200).json({ success: true, data: { accessToken: tokens.accessToken } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.status(200).json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const { user, role } = req;
  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      role,
      ...(role === 'doctor'
        ? { fullName: user.fullName, email: user.email }
        : { name: user.name, email: user.email, phone: user.phone }),
    },
  });
});

module.exports = { registerPatient, loginPatient, loginDoctor, refresh, logout, me };
