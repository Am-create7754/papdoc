const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadSignature } = require('../middlewares/signatureUpload');
const { doctorProfileUpdateSchema } = require('../validators/doctorValidators');
const doctorController = require('../controllers/doctorController');
const consultationController = require('../controllers/consultationController');

const router = express.Router();

router.get('/profile', doctorController.getPublicProfile);
router.get('/signature/:filename', doctorController.getSignatureImage);
router.get('/me', authenticate, authorize('doctor'), doctorController.getMe);
router.patch(
  '/me',
  authenticate,
  authorize('doctor'),
  validate(doctorProfileUpdateSchema),
  doctorController.updateMe
);
router.post(
  '/me/signature',
  authenticate,
  authorize('doctor'),
  uploadSignature,
  doctorController.uploadSignature
);

router.get('/consultations', authenticate, authorize('doctor'), consultationController.getAllForDoctor);
router.get(
  '/consultations/:id',
  authenticate,
  authorize('doctor'),
  consultationController.getOneForDoctor
);

module.exports = router;
