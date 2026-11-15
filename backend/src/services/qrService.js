const QRCode = require('qrcode');

/**
 * Generates a QR Code as a Data URL (base64 image)
 * Contains strictly the opaque token or token payload.
 * NEVER personal info!
 */
const generateQRCodeDataURL = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Valid raw token string is required to generate QR code');
  }

  // We embed the raw token payload format:
  // e.g. "TICKET_VERIFY:<rawToken>" or rawToken string
  const qrPayload = JSON.stringify({
    token: rawToken.trim(),
    v: 1,
  });

  const options = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a', // Deep slate for high contrast
      light: '#ffffff',
    },
  };

  return QRCode.toDataURL(qrPayload, options);
};

/**
 * Generates a QR Code as a Buffer (useful for PDF embedding)
 */
const generateQRCodeBuffer = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Valid raw token string is required to generate QR code');
  }

  const qrPayload = JSON.stringify({
    token: rawToken.trim(),
    v: 1,
  });

  const options = {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  };

  return QRCode.toBuffer(qrPayload, options);
};

module.exports = {
  generateQRCodeDataURL,
  generateQRCodeBuffer,
};
