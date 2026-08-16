const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const {
  patientRegisterSchema,
  patientLoginSchema,
  doctorLoginSchema,
} = require('../validators/authValidators');
const authController = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/patient/register',
  authLimiter,
  validate(patientRegisterSchema),
  authController.registerPatient
);
router.post('/patient/login', authLimiter, validate(patientLoginSchema), authController.loginPatient);
router.post('/doctor/login', authLimiter, validate(doctorLoginSchema), authController.loginDoctor);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
