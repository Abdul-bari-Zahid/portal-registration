const { body, query, param } = require('express-validator');
const config = require('../config/config');

const registrationValidators = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isIn(config.departments)
    .withMessage(`Department must be one of: ${config.departments.join(', ')}`),

  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage('Phone number must contain 7-20 valid phone characters'),
];

const loginValidators = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

const rejectPaymentValidators = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Rejection reason must be between 3 and 500 characters'),
];

const revokeTicketValidators = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Revocation reason is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Revocation reason must be between 3 and 500 characters'),
];

const scanValidators = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('QR Token is required')
    .isLength({ min: 8 })
    .withMessage('Invalid QR token payload length'),
];

module.exports = {
  registrationValidators,
  loginValidators,
  rejectPaymentValidators,
  revokeTicketValidators,
  scanValidators,
};
