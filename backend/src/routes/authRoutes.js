const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');
const { loginValidators } = require('../validation/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Public route: check if admin account is initialized
router.get('/setup-status', authController.getSetupStatus);

// Admin login (strictly rate limited)
router.post(
  '/login',
  loginLimiter,
  loginValidators,
  handleValidationErrors,
  authController.login
);

// Admin logout
router.post('/logout', requireAdminAuth, authController.logout);

// Admin session verification
router.get('/me', requireAdminAuth, authController.getMe);

module.exports = router;
