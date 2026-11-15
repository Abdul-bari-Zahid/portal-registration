const fs = require('fs');

/**
 * Validates file buffer magic bytes to ensure it is genuinely an allowed image format.
 * Prevents attackers from renaming .exe, .sh, .php, or HTML files to .png/.jpg.
 */
const validateFileBufferMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: 'File is too small or empty' };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isPng) {
    return { valid: true, mime: 'image/png', ext: 'png' };
  }

  // JPEG / JPG magic bytes: FF D8 FF (often followed by E0, E1, E2, E3, DB, EE)
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (isJpeg) {
    return { valid: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // WEBP magic bytes: RIFF (52 49 46 46) .... WEBP (57 45 42 50)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isWebp) {
    return { valid: true, mime: 'image/webp', ext: 'webp' };
  }

  return { valid: false, error: 'File content does not match allowed image formats (JPG, PNG, WEBP)' };
};

/**
 * Validates a file on disk by reading its header bytes
 */
const validateFileOnDisk = async (filePath) => {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 15 });
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(validateFileBufferMagicBytes(buffer));
    });
    stream.on('error', (err) => {
      resolve({ valid: false, error: err.message });
    });
  });
};

module.exports = {
  validateFileBufferMagicBytes,
  validateFileOnDisk,
};
