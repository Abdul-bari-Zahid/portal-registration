const crypto = require('crypto');

/**
 * Generates an uppercase alphanumeric string of given length
 */
const generateRandomCode = (length = 6) => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 without lookalikes (0/O, 1/I)
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/**
 * Generates a unique Registration ID e.g., REG-2026-784FK9
 */
const generateRegistrationId = () => {
  const year = new Date().getFullYear();
  return `REG-${year}-${generateRandomCode(6)}`;
};

/**
 * Generates a unique Ticket ID e.g., TCK-2026-38DA8P
 */
const generateTicketId = () => {
  const year = new Date().getFullYear();
  return `TCK-${year}-${generateRandomCode(6)}`;
};

module.exports = {
  generateRegistrationId,
  generateTicketId,
};
