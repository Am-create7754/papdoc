const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { doctorProfileUpdateSchema } = require('../validators/doctorValidators');
const doctorController = require('../controllers/doctorController');
const consultationController = require('../controllers/consultationController');

const router = express.Router();

router.get('/profile', doctorController.getPublicProfile);
router.get('/me', authenticate, authorize('doctor'), doctorController.getMe);
router.patch(
  '/me',
  authenticate,
  authorize('doctor'),
  validate(doctorProfileUpdateSchema),
  doctorController.updateMe
);

router.get('/consultations', authenticate, authorize('doctor'), consultationController.getAllForDoctor);
router.get(
  '/consultations/:id',
  authenticate,
  authorize('doctor'),
  consultationController.getOneForDoctor
);

module.exports = router;
