const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authLimiter, refreshLimiter } = require('../middlewares/rateLimiters');
const {
  patientRegisterSchema,
  patientLoginSchema,
  patientGoogleLoginSchema,
  doctorLoginSchema,
} = require('../validators/authValidators');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/patient/register',
  authLimiter,
  validate(patientRegisterSchema),
  authController.registerPatient
);
router.post('/patient/login', authLimiter, validate(patientLoginSchema), authController.loginPatient);
router.post(
  '/patient/google',
  authLimiter,
  validate(patientGoogleLoginSchema),
  authController.loginPatientWithGoogle
);
router.post('/doctor/login', authLimiter, validate(doctorLoginSchema), authController.loginDoctor);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
