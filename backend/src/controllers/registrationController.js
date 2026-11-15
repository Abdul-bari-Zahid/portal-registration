const fs = require('fs');
const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { generateRegistrationId } = require('../utils/idGenerator');
const { getSafeFilePath, fileExists } = require('../services/storageService');
const { logAction } = require('../services/auditService');

/**
 * Public Registration Submission
 */
const submitRegistration = async (req, res, next) => {
  try {
    const { fullName, email, department, phoneNumber } = req.body;

    // Check for duplicate pending or approved registration with same email
    const normalizedEmail = email.toLowerCase().trim();
    const existingRegistration = await Registration.findOne({
      email: normalizedEmail,
      paymentStatus: { $in: ['PENDING', 'APPROVED'] },
    });

    if (existingRegistration) {
      // If user uploaded a file, delete it to prevent orphaned disk files
      if (req.file) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (_) {}
      }

      return res.status(409).json({
        success: false,
        message: 'A registration with this email address already exists and is pending or approved.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot proof is required.',
      });
    }

    // Generate unique Registration ID
    let registrationId = generateRegistrationId();
    let collisionCheck = await Registration.findOne({ registrationId });
    while (collisionCheck) {
      registrationId = generateRegistrationId();
      collisionCheck = await Registration.findOne({ registrationId });
    }

    let screenshotBase64 = null;
    if (req.file) {
      try {
        const fileBuf = await fs.promises.readFile(req.file.path);
        screenshotBase64 = `data:${req.file.validatedMime || req.file.mimetype};base64,${fileBuf.toString('base64')}`;
      } catch (readErr) {
        console.error('Failed reading file to base64:', readErr);
      }
    }

    const registration = new Registration({
      fullName: fullName.trim(),
      email: normalizedEmail,
      department: department.trim(),
      phoneNumber: phoneNumber.trim(),
      paymentScreenshotStorageKey: req.file.filename,
      paymentScreenshotMimeType: req.file.validatedMime || req.file.mimetype,
      paymentScreenshotOriginalName: req.file.originalname,
      paymentScreenshotFileSize: req.file.size,
      paymentScreenshotBase64: screenshotBase64,
      registrationId,
      paymentStatus: 'PENDING',
    });

    await registration.save();

    await logAction({
      action: 'PUBLIC_REGISTRATION_SUBMITTED',
      registrationId: registration.registrationId,
      req,
      details: {
        fullName: registration.fullName,
        email: registration.email,
        department: registration.department,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Your registration has been submitted successfully. Your payment is pending verification by the administrator.',
      data: {
        registrationId: registration.registrationId,
        fullName: registration.fullName,
        email: registration.email,
        department: registration.department,
        submittedAt: registration.createdAt,
      },
    });
  } catch (err) {
    if (req.file) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (_) {}
    }
    next(err);
  }
};

/**
 * Admin: List registrations with filtering, search, pagination, and sorting
 */
const listRegistrations = async (req, res, next) => {
  try {
    const {
      search = '',
      department = '',
      paymentStatus = '',
      ticketStatus = '',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Filter by department
    if (department && department !== 'ALL') {
      query.department = department;
    }

    // Filter by paymentStatus
    if (paymentStatus && paymentStatus !== 'ALL') {
      query.paymentStatus = paymentStatus;
    }

    // Text search by name, email, or registrationId
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { registrationId: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [total, registrations] = await Promise.all([
      Registration.countDocuments(query),
      Registration.find(query).sort(sortOption).skip(skip).limit(limitNum).lean(),
    ]);

    // Attach ticket information for each registration
    const registrationIds = registrations.map((r) => r._id);
    const tickets = await Ticket.find({ registrationId: { $in: registrationIds } }).lean();
    const ticketMap = new Map();
    tickets.forEach((t) => {
      ticketMap.set(t.registrationId.toString(), t);
    });

    const enriched = registrations.map((reg) => {
      const ticket = ticketMap.get(reg._id.toString());
      return {
        ...reg,
        ticket: ticket
          ? {
              _id: ticket._id,
              ticketId: ticket.ticketId,
              ticketStatus: ticket.ticketStatus,
              isScanned: ticket.isScanned,
              scannedAt: ticket.scannedAt,
              deliveryStatus: ticket.deliveryStatus,
              sentAt: ticket.sentAt,
            }
          : null,
      };
    });

    // Optional ticketStatus filter in memory or via subquery
    let result = enriched;
    if (ticketStatus && ticketStatus !== 'ALL') {
      if (ticketStatus === 'NO_TICKET') {
        result = enriched.filter((r) => !r.ticket);
      } else {
        result = enriched.filter((r) => r.ticket && r.ticket.ticketStatus === ticketStatus);
      }
    }

    return res.status(200).json({
      success: true,
      data: result,
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
 * Admin: Get registration details by ID
 */
const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration identifier provided.',
      });
    }

    let registration;
    const cleanId = String(id).trim();
    if (cleanId.startsWith('REG-')) {
      registration = await Registration.findOne({ registrationId: cleanId });
    } else if (mongoose.Types.ObjectId.isValid(cleanId)) {
      registration = await Registration.findById(cleanId);
    } else {
      registration = await Registration.findOne({ registrationId: cleanId });
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    const ticket = await Ticket.findOne({ registrationId: registration._id });

    return res.status(200).json({
      success: true,
      data: {
        registration,
        ticket,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin Only: Stream payment screenshot image securely.
 * Rejects all unauthenticated users. Protects against directory traversal.
 */
const streamPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;

    let registration = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      registration = await Registration.findById(id);
    }
    if (!registration) {
      registration = await Registration.findOne({ registrationId: id });
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found',
      });
    }

    // 1. If base64 is saved in Atlas, serve it directly (universal compatibility across serverless cold starts)
    if (registration.paymentScreenshotBase64) {
      const parts = registration.paymentScreenshotBase64.split(';base64,');
      const mime = parts[0].replace('data:', '') || registration.paymentScreenshotMimeType || 'image/jpeg';
      const imgBuffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.end(imgBuffer);
    }

    // 2. Otherwise try local disk file
    const key = registration.paymentScreenshotStorageKey;
    if (key && fileExists(key)) {
      const filePath = getSafeFilePath(key);
      res.setHeader('Content-Type', registration.paymentScreenshotMimeType || 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      const readStream = fs.createReadStream(filePath);
      return readStream.pipe(res);
    }

    return res.status(404).json({
      success: false,
      message: 'Payment screenshot proof file was not found on server',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitRegistration,
  listRegistrations,
  getRegistrationById,
  streamPaymentProof,
};
