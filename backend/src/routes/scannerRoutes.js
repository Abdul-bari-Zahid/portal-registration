const express = require('express');
const router = express.Router();
const scannerController = require('../controllers/scannerController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { scannerLimiter } = require('../middleware/rateLimiter');
const { scanValidators } = require('../validation/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Scanner routes are admin-protected and rate-limited
router.use(requireAdminAuth);

router.post(
  '/verify',
  scannerLimiter,
  scanValidators,
  handleValidationErrors,
  scannerController.verifyAndScanTicket
);

module.exports = router;
