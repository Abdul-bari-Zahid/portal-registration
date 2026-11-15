const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const { hashToken } = require('../utils/cryptoUtils');
const { logAction } = require('../services/auditService');

/**
 * Atomic QR Code Scanning & Verification Endpoint
 *
 * Guarantees that even if two simultaneous scans hit the backend at the exact same millisecond,
 * only the FIRST scan succeeds atomically in MongoDB.
 */
const verifyAndScanTicket = async (req, res, next) => {
  try {
    const { token: rawInput } = req.body;

    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        message: 'INVALID QR CODE - Missing or invalid scan payload.',
      });
    }

    // Parse payload: Could be JSON object string {"token":"...", "v":1} or direct token
    let tokenStr = rawInput.trim();
    try {
      if (tokenStr.startsWith('{') && tokenStr.endsWith('}')) {
        const parsed = JSON.parse(tokenStr);
        if (parsed.token) {
          tokenStr = parsed.token.trim();
        } else if (parsed.t) {
          tokenStr = parsed.t.trim();
        } else if (parsed.ticketId) {
          tokenStr = parsed.ticketId.trim();
        }
      }
    } catch (_) {
      // Keep tokenStr as plain string if JSON parse fails
    }

    // Compute SHA-256 hash of token
    const tokenHash = hashToken(tokenStr);
    const queryHashes = [tokenHash, tokenStr];

    // Determine query condition supporting:
    // 1. Opaque QR token / Token Hash (standard camera scans)
    // 2. Direct Ticket ID (e.g. TCK-2026-XXXXXX)
    // 3. Direct Registration ID (e.g. REG-2026-XXXXXX)
    let matchCondition = {};
    if (tokenStr.startsWith('REG-')) {
      const reg = await Registration.findOne({ registrationId: tokenStr });
      if (!reg) {
        await logAction({
          action: 'QR_SCANNED_INVALID',
          adminId: req.admin ? req.admin._id : null,
          req,
          details: { attemptedPayload: tokenStr.substring(0, 24) },
        });

        return res.status(404).json({
          success: false,
          status: 'INVALID',
          message: 'INVALID REGISTRATION ID - No registration found.',
        });
      }
      matchCondition = { registrationId: reg._id };
    } else if (tokenStr.startsWith('TCK-')) {
      matchCondition = { ticketId: tokenStr };
    } else {
      matchCondition = {
        $or: [
          { qrTokenHash: { $in: queryHashes } },
          { ticketId: tokenStr },
        ],
      };
    }

    const currentTimestamp = new Date();

    // 1. ATOMIC OPERATION: find and update ONLY if ticketStatus is ISSUED and isScanned is false
    const scannedTicket = await Ticket.findOneAndUpdate(
      {
        ...matchCondition,
        ticketStatus: 'ISSUED',
        isScanned: false,
      },
      {
        $set: {
          ticketStatus: 'SCANNED',
          isScanned: true,
          scannedAt: currentTimestamp,
        },
      },
      {
        returnDocument: 'after',
      }
    ).populate('registrationId');

    // Scenario A: First successful atomic scan
    if (scannedTicket && scannedTicket.registrationId) {
      const reg = scannedTicket.registrationId;

      await logAction({
        action: 'QR_SCANNED_SUCCESS',
        registrationId: reg.registrationId,
        ticketId: scannedTicket.ticketId,
        adminId: req.admin ? req.admin._id : null,
        req,
        details: {
          ticketId: scannedTicket.ticketId,
          entryTime: scannedTicket.scannedAt,
        },
      });

      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        message: 'ENTRY SUCCESSFUL',
        data: {
          userName: reg.fullName,
          registrationId: reg.registrationId,
          department: reg.department,
          ticketId: scannedTicket.ticketId,
          entryTime: scannedTicket.scannedAt,
        },
      });
    }

    // If atomic update did not match, find why by querying the ticket state
    const existingTicket = await Ticket.findOne(matchCondition).populate('registrationId');

    // Scenario B: Ticket does not exist anywhere in DB
    if (!existingTicket) {
      await logAction({
        action: 'QR_SCANNED_INVALID',
        adminId: req.admin ? req.admin._id : null,
        req,
        details: { attemptedPayload: tokenStr.substring(0, 16) + '...' },
      });

      return res.status(404).json({
        success: false,
        status: 'INVALID',
        message: 'INVALID QR CODE',
      });
    }

    const reg = existingTicket.registrationId || {};

    // Scenario C: Already scanned previously
    if (existingTicket.isScanned || existingTicket.ticketStatus === 'SCANNED') {
      await logAction({
        action: 'QR_SCANNED_DUPLICATE',
        ticketId: existingTicket.ticketId,
        registrationId: reg.registrationId || null,
        adminId: req.admin ? req.admin._id : null,
        req,
        details: {
          ticketId: existingTicket.ticketId,
          originalScanTime: existingTicket.scannedAt,
        },
      });

      return res.status(409).json({
        success: false,
        status: 'ALREADY_SCANNED',
        message: 'ALREADY SCANNED',
        description: 'This QR code has already been used.',
        data: {
          userName: reg.fullName || 'N/A',
          registrationId: reg.registrationId || 'N/A',
          department: reg.department || 'N/A',
          ticketId: existingTicket.ticketId,
          originalEntryTime: existingTicket.scannedAt,
        },
      });
    }

    // Scenario D: Ticket was Revoked
    if (existingTicket.ticketStatus === 'REVOKED') {
      await logAction({
        action: 'QR_SCANNED_REVOKED',
        ticketId: existingTicket.ticketId,
        registrationId: reg.registrationId || null,
        adminId: req.admin ? req.admin._id : null,
        req,
        details: { reason: existingTicket.revocationReason },
      });

      return res.status(403).json({
        success: false,
        status: 'REVOKED',
        message: 'TICKET NOT VALID',
        description: `Ticket has been revoked: ${existingTicket.revocationReason || 'Revoked by admin'}`,
        data: {
          ticketId: existingTicket.ticketId,
          revokedAt: existingTicket.revokedAt,
        },
      });
    }

    // Scenario E: Ticket exists but payment not valid or status not ISSUED
    return res.status(400).json({
      success: false,
      status: 'NOT_VALID',
      message: 'TICKET NOT VALID',
      description: `Current ticket status: ${existingTicket.ticketStatus}`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyAndScanTicket,
};
