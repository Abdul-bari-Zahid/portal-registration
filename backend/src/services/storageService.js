const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure private upload directory exists
if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

/**
 * Returns safe absolute path for a stored key inside private upload directory.
 * Defends strictly against path traversal vulnerabilities (e.g. "../../../etc/passwd").
 */
const getSafeFilePath = (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') {
    throw new Error('Invalid storage key provided');
  }

  // Strip path traversal tokens
  const cleanKey = path.basename(storageKey);
  const resolvedPath = path.resolve(config.upload.dir, cleanKey);

  // Guard against directory escape
  if (!resolvedPath.startsWith(path.resolve(config.upload.dir))) {
    throw new Error('Unauthorized path access attempt detected');
  }

  return resolvedPath;
};

/**
 * Checks if a file exists in private storage
 */
const fileExists = (storageKey) => {
  try {
    const filePath = getSafeFilePath(storageKey);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

/**
 * Deletes a file from private storage (e.g. on registration rollback)
 */
const deleteFile = async (storageKey) => {
  try {
    const filePath = getSafeFilePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error('Storage deletion error:', err.message);
  }
};

module.exports = {
  getSafeFilePath,
  fileExists,
  deleteFile,
};
