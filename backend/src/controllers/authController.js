const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/config');
const { logAction } = require('../services/auditService');

/**
 * Admin Login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!admin) {
      await logAction({
        action: 'FAILED_LOGIN_ATTEMPT',
        req,
        details: { attemptedEmail: email, reason: 'Admin user not found' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials provided.',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await logAction({
        action: 'FAILED_LOGIN_ATTEMPT',
        req,
        details: { attemptedEmail: email, reason: 'Incorrect password' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials provided.',
      });
    }

    // Update lastLoginAt
    admin.lastLoginAt = new Date();
    await admin.save();

    // Create JWT
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Set HttpOnly Cookie
    res.cookie(config.cookie.name, token, config.cookie.options);

    await logAction({
      action: 'ADMIN_LOGIN_SUCCESS',
      adminId: admin._id,
      req,
      details: { email: admin.email },
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token, // Also return in body for mobile/bearer clients
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin Logout
 */
const logout = async (req, res, next) => {
  try {
    const adminId = req.admin ? req.admin._id : null;

    res.clearCookie(config.cookie.name, {
      httpOnly: true,
      secure: config.cookie.options.secure,
      sameSite: config.cookie.options.sameSite,
    });

    if (adminId) {
      await logAction({
        action: 'ADMIN_LOGOUT',
        adminId,
        req,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated admin session
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role,
      lastLoginAt: req.admin.lastLoginAt,
      createdAt: req.admin.createdAt,
    },
  });
};

/**
 * Check if the single admin is initialized
 */
const getSetupStatus = async (req, res, next) => {
  try {
    const count = await Admin.countDocuments();
    return res.status(200).json({
      success: true,
      initialized: count > 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  getSetupStatus,
};
