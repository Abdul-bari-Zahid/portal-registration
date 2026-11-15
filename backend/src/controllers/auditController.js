const AuditLog = require('../models/AuditLog');

/**
 * Get paginated audit logs for admin review
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action = '', search = '', page = 1, limit = 20 } = req.query;

    const query = {};

    if (action && action !== 'ALL') {
      query.action = action;
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { registrationId: searchRegex },
        { ticketId: searchRegex },
        { action: searchRegex },
        { ipAddress: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('adminId', 'email role')
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
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

module.exports = {
  getAuditLogs,
};
