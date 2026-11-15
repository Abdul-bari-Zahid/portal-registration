const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { generateTicketId } = require('../utils/idGenerator');
const { generateSecureToken, hashToken } = require('../utils/cryptoUtils');
const { generateQRCodeDataURL } = require('../services/qrService');
const { logAction } = require('../services/auditService');

/**
 * Approve payment and generate unique QR ticket
 */
const approvePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found',
      });
    }

    if (registration.paymentStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This registration payment is already approved and ticket is issued.',
      });
    }

    // Check if ticket already exists for this registration to prevent duplicate issuance
    let existingTicket = await Ticket.findOne({ registrationId: registration._id });
    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: 'A ticket has already been generated for this registration.',
      });
    }

    // Generate unique Ticket ID
    let ticketId = generateTicketId();
    let collisionCheck = await Ticket.findOne({ ticketId });
    while (collisionCheck) {
      ticketId = generateTicketId();
      collisionCheck = await Ticket.findOne({ ticketId });
    }

    // Generate cryptographically unpredictable token
    const rawToken = generateSecureToken();
    const qrTokenHash = hashToken(rawToken);

    // Update Registration
    registration.paymentStatus = 'APPROVED';
    registration.paymentApprovedAt = new Date();
    registration.paymentRejectedAt = null;
    registration.rejectionReason = null;
    await registration.save();

    // Create Ticket
    const ticket = new Ticket({
      ticketId,
      registrationId: registration._id,
      qrTokenHash,
      ticketStatus: 'ISSUED',
      isScanned: false,
      issuedAt: new Date(),
      deliveryStatus: 'NOT_SENT',
    });
    await ticket.save();

    // Generate QR code data URL with the raw token for client display
    const qrDataUrl = await generateQRCodeDataURL(rawToken);

    // Audit log
    await logAction({
      action: 'PAYMENT_APPROVED',
      registrationId: registration.registrationId,
      ticketId: ticket.ticketId,
      adminId: req.admin._id,
      req,
      details: {
        registrationId: registration.registrationId,
        ticketId: ticket.ticketId,
        approvedBy: req.admin.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and approved successfully. QR Ticket has been generated.',
      data: {
        registration,
        ticket,
        rawToken, // Provided once to admin upon issuance for immediate generation/preview
        qrDataUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject payment
 */
const rejectPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const registration = await Registration.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found',
      });
    }

    if (registration.paymentStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved registration. Please revoke ticket first.',
      });
    }

    registration.paymentStatus = 'REJECTED';
    registration.paymentRejectedAt = new Date();
    registration.rejectionReason = (reason || 'Payment verification failed').trim();
    await registration.save();

    await logAction({
      action: 'PAYMENT_REJECTED',
      registrationId: registration.registrationId,
      adminId: req.admin._id,
      req,
      details: {
        registrationId: registration.registrationId,
        rejectionReason: registration.rejectionReason,
        rejectedBy: req.admin.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Registration payment has been rejected.',
      data: {
        registration,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  approvePayment,
  rejectPayment,
};
