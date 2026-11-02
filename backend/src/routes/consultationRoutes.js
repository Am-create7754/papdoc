const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadAttachments } = require('../middlewares/upload');
const { cleanupUploadsOnError, verifyUploadedFileTypes } = require('../middlewares/uploadSafety');
const { consultationCreateLimiter, precheckLimiter } = require('../middlewares/rateLimiters');
const { createConsultationSchema, precheckInputSchema } = require('../validators/consultationValidators');
const consultationController = require('../controllers/consultationController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize('patient'),
  consultationCreateLimiter,
  cleanupUploadsOnError,
  uploadAttachments,
  verifyUploadedFileTypes,
  validate(createConsultationSchema),
  consultationController.create
);
router.post(
  '/precheck',
  authenticate,
  authorize('patient'),
  precheckLimiter,
  validate(precheckInputSchema),
  consultationController.precheckInput
);
router.get('/my', authenticate, authorize('patient'), consultationController.getMy);
router.get('/:id', authenticate, authorize('patient'), consultationController.getOneForPatient);
router.get(
  '/:id/attachments/:attachmentId',
  authenticate,
  consultationController.getAttachment
);
router.get('/:id/prescription', authenticate, consultationController.downloadPrescription);

module.exports = router;
