const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { videoTokenLimiter } = require('../middlewares/rateLimiters');
const { noShowSchema } = require('../validators/videoValidators');
const videoController = require('../controllers/videoController');

const router = express.Router();

router.get('/availability', videoController.availability);

router.get('/my', authenticate, authorize('patient'), videoController.getMy);
router.get('/doctor/queue', authenticate, authorize('doctor'), videoController.getDoctorQueue);
router.get(
  '/by-consultation/:consultationId',
  authenticate,
  authorize('patient', 'doctor'),
  videoController.getSummaryForConsultation
);

router.get('/:sessionId', authenticate, authorize('patient'), videoController.getOneForPatient);
router.post(
  '/:sessionId/token',
  authenticate,
  authorize('patient', 'doctor'),
  videoTokenLimiter,
  videoController.issueToken
);
router.post('/:sessionId/joined', authenticate, authorize('patient', 'doctor'), videoController.reportJoined);
router.post('/:sessionId/cancel', authenticate, authorize('patient'), videoController.cancelSession);
router.post('/:sessionId/end', authenticate, authorize('doctor'), videoController.endSession);
router.post(
  '/:sessionId/no-show',
  authenticate,
  authorize('doctor'),
  validate(noShowSchema),
  videoController.markNoShow
);

module.exports = router;
