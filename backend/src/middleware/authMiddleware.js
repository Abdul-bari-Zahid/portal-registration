const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Admin = require('../models/Admin');

const requireAdminAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies[config.cookie.name]) {
      token = req.cookies[config.cookie.name];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      // 2. Fallback to Authorization Header (useful for curl, testing, API clients)
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session or token provided.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.',
      });
    }

    // Ensure admin user exists and is active
    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or access revoked.',
      });
    }

    if (admin.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Insufficient administrative privileges.',
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error('Auth Middleware Exception:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
};

module.exports = {
  requireAdminAuth,
};
