const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit record for critical system actions
 */
const logAction = async ({
  action,
  registrationId = null,
  ticketId = null,
  adminId = null,
  req = null,
  details = {},
}) => {
  try {
    const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    const log = new AuditLog({
      action,
      registrationId,
      ticketId,
      adminId,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date(),
    });

    await log.save();
    return log;
  } catch (err) {
    console.error('Audit Logging Error (non-blocking):', err.message);
    return null;
  }
};

module.exports = {
  logAction,
};
