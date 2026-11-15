const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const { generateTicketPDF } = require('../services/pdfService');
const { generateQRCodeDataURL } = require('../services/qrService');
const { logAction } = require('../services/auditService');

/**
 * Safely resolves a ticket by either MongoDB ObjectId or custom Ticket ID (TCK-...)
 */
const resolveTicket = async (id) => {
  if (!id || id === 'undefined' || id === 'null') {
    return null;
  }
  const cleanId = String(id).trim();
  if (cleanId.startsWith('TCK-')) {
    return Ticket.findOne({ ticketId: cleanId }).populate('registrationId');
  }
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const byId = await Ticket.findById(cleanId).populate('registrationId');
    if (byId) return byId;
  }
  return Ticket.findOne({ ticketId: cleanId }).populate('registrationId');
};

/**
 * List all tickets with filtering, pagination, and sorting
 */
const listTickets = async (req, res, next) => {
  try {
    const {
      status = 'ALL',
      deliveryStatus = 'ALL',
      search = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Filter by ticket status
    if (status && status !== 'ALL') {
      if (status === 'UNSCANNED') {
        query.ticketStatus = 'ISSUED';
        query.isScanned = false;
      } else if (status === 'SCANNED') {
        query.isScanned = true;
      } else {
        query.ticketStatus = status;
      }
    }

    // Filter by delivery status
    if (deliveryStatus && deliveryStatus !== 'ALL') {
      query.deliveryStatus = deliveryStatus;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Search query
    let regMatchFilter = {};
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const matchingRegistrations = await Registration.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { registrationId: searchRegex },
        ],
      }).select('_id');

      const regIds = matchingRegistrations.map((r) => r._id);
      query.$or = [
        { ticketId: searchRegex },
        { registrationId: { $in: regIds } },
      ];
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(query),
      Ticket.find(query)
        .populate('registrationId')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get ticket details by ID
 */
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket identifier provided.',
      });
    }

    const ticket = await resolveTicket(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark ticket as manually sent to user
 */
const markAsSent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket identifier provided.',
      });
    }

    const ticket = await resolveTicket(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    ticket.deliveryStatus = 'SENT';
    ticket.sentAt = new Date();
    await ticket.save();

    await logAction({
      action: 'TICKET_MARKED_SENT',
      ticketId: ticket.ticketId,
      registrationId: ticket.registrationId ? ticket.registrationId.registrationId : null,
      adminId: req.admin._id,
      req,
      details: {
        sentAt: ticket.sentAt,
        markedBy: req.admin.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket marked as sent to attendee.',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Revoke ticket
 */
const revokeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket identifier provided.',
      });
    }

    const ticket = await resolveTicket(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    if (ticket.ticketStatus === 'REVOKED') {
      return res.status(400).json({
        success: false,
        message: 'Ticket is already revoked',
      });
    }

    ticket.ticketStatus = 'REVOKED';
    ticket.revokedAt = new Date();
    ticket.revocationReason = (reason || 'Revoked by administrator').trim();
    await ticket.save();

    await logAction({
      action: 'TICKET_REVOKED',
      ticketId: ticket.ticketId,
      registrationId: ticket.registrationId ? ticket.registrationId.registrationId : null,
      adminId: req.admin._id,
      req,
      details: {
        revokedBy: req.admin.email,
        reason: ticket.revocationReason,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket has been revoked successfully.',
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download Ticket as PDF
 */
const downloadTicketPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket identifier provided.',
      });
    }

    const ticket = await resolveTicket(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const pdfBuffer = await generateTicketPDF({
      registration: ticket.registrationId,
      ticket,
      rawToken: null,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${ticket.ticketId}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Get ticket data for client rendering & printing
 */
const getTicketPrintData = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket identifier provided.',
      });
    }

    const ticket = await resolveTicket(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const qrDataUrl = await generateQRCodeDataURL(ticket.qrTokenHash);

    return res.status(200).json({
      success: true,
      data: {
        ticket,
        registration: ticket.registrationId,
        qrDataUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTickets,
  getTicketById,
  markAsSent,
  revokeTicket,
  downloadTicketPdf,
  getTicketPrintData,
};
