const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');

/**
 * Get aggregated dashboard statistics and recent activity feed
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalRegistrations,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      totalTicketsGenerated,
      totalScannedTickets,
      unscannedTickets,
      recentActivity,
    ] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ paymentStatus: 'PENDING' }),
      Registration.countDocuments({ paymentStatus: 'APPROVED' }),
      Registration.countDocuments({ paymentStatus: 'REJECTED' }),
      Ticket.countDocuments(),
      Ticket.countDocuments({ isScanned: true }),
      Ticket.countDocuments({ ticketStatus: 'ISSUED', isScanned: false }),
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('adminId', 'email role')
        .lean(),
    ]);

    // Remaining entries = Tickets issued and not yet scanned
    const remainingEntries = unscannedTickets;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRegistrations,
          pendingPayments,
          approvedPayments,
          rejectedPayments,
          totalTicketsGenerated,
          totalScannedTickets,
          remainingEntries,
        },
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
};
