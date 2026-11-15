const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const config = require('../config/config');
const { validateFileOnDisk } = require('../utils/fileValidation');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure upload dir exists
    if (!fs.existsSync(config.upload.dir)) {
      fs.mkdirSync(config.upload.dir, { recursive: true });
    }
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeKey = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeKey);
  },
});

// File filter check for initial mime type
const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file format: ${file.mimetype}. Allowed formats are JPEG, JPG, PNG, and WEBP.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSizeMb * 1024 * 1024, // In bytes
  },
  fileFilter,
});

/**
 * Secondary deep inspection middleware:
 * Validates actual binary magic bytes on disk.
 * If file fails magic byte check, removes it immediately.
 */
const verifyUploadedFileIntegrity = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Payment screenshot image is required',
    });
  }

  const filePath = req.file.path;
  const validation = await validateFileOnDisk(filePath);

  if (!validation.valid) {
    // Malicious or mismatched file detected: securely remove from disk
    try {
      await fs.promises.unlink(filePath);
    } catch (cleanupErr) {
      console.error('Failed to remove rejected file:', cleanupErr.message);
    }

    return res.status(400).json({
      success: false,
      message: `File security verification failed: ${validation.error}`,
    });
  }

  // File passed deep inspection
  req.file.validatedMime = validation.mime;
  next();
};

module.exports = {
  upload,
  verifyUploadedFileIntegrity,
};
