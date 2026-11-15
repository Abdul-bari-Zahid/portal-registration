const crypto = require('crypto');

/**
 * Generates an unpredictable cryptographically secure token
 * 32 bytes = 256 bits of entropy = 64 hex characters
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Computes SHA-256 hash of a string
 * Used to store only the hash of the QR token in the database
 */
const hashToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid string token is required for hashing');
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Constant-time comparison of two string hashes to prevent timing attacks
 */
const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

module.exports = {
  generateSecureToken,
  hashToken,
  timingSafeEqual,
};
