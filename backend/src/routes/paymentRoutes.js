const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { rejectPaymentValidators } = require('../validation/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// All payment routes are admin protected
router.use(requireAdminAuth);

// Approve payment and issue QR ticket
router.post('/registrations/:id/approve', paymentController.approvePayment);

// Reject payment
router.post(
  '/registrations/:id/reject',
  rejectPaymentValidators,
  handleValidationErrors,
  paymentController.rejectPayment
);

module.exports = router;
