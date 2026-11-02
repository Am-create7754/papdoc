const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadSignature } = require('../middlewares/signatureUpload');
const { cleanupUploadsOnError, verifyUploadedFileTypes } = require('../middlewares/uploadSafety');
const { doctorWriteLimiter } = require('../middlewares/rateLimiters');
const { doctorProfileUpdateSchema } = require('../validators/doctorValidators');
const { manualReplySchema } = require('../validators/consultationValidators');
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
  doctorWriteLimiter,
  cleanupUploadsOnError,
  uploadSignature,
  verifyUploadedFileTypes,
  doctorController.uploadSignature
);

router.get('/consultations', authenticate, authorize('doctor'), consultationController.getAllForDoctor);
router.get(
  '/consultations/:id',
  authenticate,
  authorize('doctor'),
  consultationController.getOneForDoctor
);
router.post(
  '/consultations/:id/manual-reply',
  authenticate,
  authorize('doctor'),
  doctorWriteLimiter,
  validate(manualReplySchema),
  consultationController.manualReply
);

module.exports = router;
