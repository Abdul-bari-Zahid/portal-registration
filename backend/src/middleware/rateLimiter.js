const rateLimit = require('express-rate-limit');

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Strict rate limit for login to defend against brute force attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6, // 6 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP. Please try again after 15 minutes.',
  },
});

// Public registration rate limit
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // max 20 submissions per IP/hr
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Registration rate limit exceeded for this IP. Please try again later.',
  },
});

// QR scanner rate limit
const scannerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 checks/minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Scanner query rate limit exceeded. Please throttle scanning rate.',
  },
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registrationLimiter,
  scannerLimiter,
};
