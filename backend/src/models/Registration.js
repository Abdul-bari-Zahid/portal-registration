const mongoose = require('mongoose');
const config = require('../config/config');

const registrationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+()-\s]{7,20}$/, 'Please provide a valid phone number'],
    },
    paymentScreenshotStorageKey: {
      type: String,
      required: [true, 'Payment screenshot storage reference is required'],
    },
    paymentScreenshotMimeType: {
      type: String,
      default: 'image/jpeg',
    },
    paymentScreenshotOriginalName: {
      type: String,
      default: 'payment_screenshot',
    },
    paymentScreenshotFileSize: {
      type: Number,
      default: 0,
    },
    registrationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    paymentApprovedAt: {
      type: Date,
      default: null,
    },
    paymentRejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying registrations efficiently
registrationSchema.index({ paymentStatus: 1, createdAt: -1 });
registrationSchema.index({ email: 1, paymentStatus: 1 });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
