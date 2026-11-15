const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: [true, 'Ticket ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration reference is required'],
      unique: true, // One ticket per registration
      index: true,
    },
    qrTokenHash: {
      type: String,
      required: [true, 'QR token hash is required'],
      unique: true,
      index: true,
    },
    ticketStatus: {
      type: String,
      enum: ['ISSUED', 'SCANNED', 'REVOKED'],
      default: 'ISSUED',
      index: true,
    },
    isScanned: {
      type: Boolean,
      default: false,
      index: true,
    },
    scannedAt: {
      type: Date,
      default: null,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    deliveryStatus: {
      type: String,
      enum: ['NOT_SENT', 'SENT'],
      default: 'NOT_SENT',
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// High-performance indexes for scanning and analytics
ticketSchema.index({ qrTokenHash: 1, ticketStatus: 1, isScanned: 1 });
ticketSchema.index({ deliveryStatus: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
