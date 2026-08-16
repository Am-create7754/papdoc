const express = require('express');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { patientProfileUpdateSchema } = require('../validators/patientValidators');
const patientController = require('../controllers/patientController');

const router = express.Router();

router.get('/me', authenticate, authorize('patient'), patientController.getMe);
router.patch(
  '/me',
  authenticate,
  authorize('patient'),
  validate(patientProfileUpdateSchema),
  patientController.updateMe
);

module.exports = router;
