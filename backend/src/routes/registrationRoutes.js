const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { upload, verifyUploadedFileIntegrity } = require('../middleware/uploadMiddleware');
const { registrationLimiter } = require('../middleware/rateLimiter');
const { registrationValidators } = require('../validation/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Public registration endpoint
router.post(
  '/',
  registrationLimiter,
  upload.single('paymentProof'),
  verifyUploadedFileIntegrity,
  registrationValidators,
  handleValidationErrors,
  registrationController.submitRegistration
);

// Admin endpoints (strictly authenticated)
router.get('/', requireAdminAuth, registrationController.listRegistrations);
router.get('/:id', requireAdminAuth, registrationController.getRegistrationById);

// Admin-only protected stream for payment proof screenshot
router.get('/:id/payment-proof', requireAdminAuth, registrationController.streamPaymentProof);

module.exports = router;
