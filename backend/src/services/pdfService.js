const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrService');
const config = require('../config/config');

/**
 * Generates a clean, professional event ticket as a PDF stream
 *
 * Layout:
 * +-----------------------------------------------------------+
 * | TOP HEADER: Event Banner & Branding                       |
 * +---------------------------------------+-------------------+
 * | LEFT SECTION                          | RIGHT SECTION     |
 * | - Event Name                          | - Large QR Code   |
 * | - Attendee: Full Name                 |   (High res)      |
 * | - Registration ID                     |                   |
 * | - Ticket ID                           | - "SCAN FOR ENTRY"|
 * | - Department                          |   Opaque token    |
 * | - Email & Phone                       |                   |
 * | - Payment Status: APPROVED            |                   |
 * +---------------------------------------+-------------------+
 * | BOTTOM SECTION: Security notice, Single Entry, Issue info |
 * +-----------------------------------------------------------+
 */
const generateTicketPDF = async ({ registration, ticket, rawToken }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [600, 360], // Landscape ticket proportions
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Generate QR Code image buffer from rawToken or placeholder
      let qrBuffer;
      if (rawToken) {
        qrBuffer = await generateQRCodeBuffer(rawToken);
      } else {
        // Fallback token identifier if re-downloading without raw token in memory
        qrBuffer = await generateQRCodeBuffer(ticket.qrTokenHash);
      }

      // Background Card
      doc
        .roundedRect(15, 15, 570, 330, 12)
        .fillAndStroke('#0f172a', '#334155');

      // Top Event Accent Bar
      doc
        .roundedRect(15, 15, 570, 48, 10)
        .fill('#1e293b');

      // Header Text
      doc
        .fontSize(14)
        .fillColor('#818cf8')
        .font('Helvetica-Bold')
        .text('OFFICIAL ENTRY PASS — URAAN TRIP 2026', 30, 24, { width: 370 });

      doc
        .fontSize(10)
        .fillColor('#38bdf8')
        .font('Helvetica-Bold')
        .text('EVENT DATE: 11/22/2026', 30, 42);

      // Divider line
      doc
        .strokeColor('#334155')
        .lineWidth(1)
        .moveTo(15, 63)
        .lineTo(585, 63)
        .stroke();

      // LEFT SECTION DETAILS
      const leftX = 30;
      let curY = 75;

      // Full Name
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('ATTENDEE NAME', leftX, curY);
      doc
        .fontSize(15)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(registration.fullName || 'N/A', leftX, curY + 11);

      curY += 38;

      // Registration ID & Ticket ID
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('REGISTRATION ID', leftX, curY);
      doc
        .fontSize(11)
        .fillColor('#38bdf8')
        .font('Helvetica-Bold')
        .text(registration.registrationId, leftX, curY + 11);

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('TICKET ID', leftX + 160, curY);
      doc
        .fontSize(11)
        .fillColor('#a78bfa')
        .font('Helvetica-Bold')
        .text(ticket.ticketId, leftX + 160, curY + 11);

      curY += 35;

      // Department & Phone
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('DEPARTMENT', leftX, curY);
      doc
        .fontSize(10)
        .fillColor('#e2e8f0')
        .font('Helvetica')
        .text(registration.department || 'N/A', leftX, curY + 11, { width: 150 });

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('PHONE', leftX + 160, curY);
      doc
        .fontSize(10)
        .fillColor('#e2e8f0')
        .font('Helvetica')
        .text(registration.phoneNumber || 'N/A', leftX + 160, curY + 11);

      curY += 35;

      // Email & Payment Status
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('EMAIL ADDRESS', leftX, curY);
      doc
        .fontSize(10)
        .fillColor('#e2e8f0')
        .font('Helvetica')
        .text(registration.email || 'N/A', leftX, curY + 11, { width: 160 });

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('PAYMENT STATUS', leftX + 160, curY);
      doc
        .fontSize(10)
        .fillColor('#22c55e') // Green for approved
        .font('Helvetica-Bold')
        .text('APPROVED (VERIFIED)', leftX + 160, curY + 11);

      // ADMISSION GUIDELINES SECTION IN PDF (3 RULES)
      const noticeY = 205;
      doc
        .roundedRect(leftX, noticeY, 330, 72, 6)
        .fill('#0b1120');

      doc
        .fontSize(7.5)
        .fillColor('#38bdf8')
        .font('Helvetica-Bold')
        .text('ADMISSION GUIDELINES:', leftX + 8, noticeY + 6);

      doc
        .fontSize(7)
        .fillColor('#e2e8f0')
        .font('Helvetica')
        .text('1. This ticket is strictly valid for ONE-TIME entry scan only.', leftX + 8, noticeY + 20)
        .text('2. Do not share or forward your ticket or QR code to anyone.', leftX + 8, noticeY + 34)
        .text('3. Please present your valid student ID card along with this pass at the gate.', leftX + 8, noticeY + 48);

      // Vertical dashed separator line between left & right section
      doc
        .strokeColor('#334155')
        .lineWidth(1)
        .dash(4, { space: 4 })
        .moveTo(375, 70)
        .lineTo(375, 280)
        .stroke()
        .undash();

      // RIGHT SECTION: QR Code Container
      const qrBoxX = 395;
      const qrBoxY = 75;

      // White frame for high scanner contrast
      doc
        .roundedRect(qrBoxX, qrBoxY, 160, 160, 8)
        .fill('#ffffff');

      // Embed QR Image
      doc.image(qrBuffer, qrBoxX + 10, qrBoxY + 10, {
        width: 140,
        height: 140,
      });

      // Label below QR
      doc
        .fontSize(10)
        .fillColor('#38bdf8')
        .font('Helvetica-Bold')
        .text('SCAN FOR ENTRY', qrBoxX, qrBoxY + 168, { width: 160, align: 'center' });

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('One Time Single Admission', qrBoxX, qrBoxY + 182, { width: 160, align: 'center' });

      // BOTTOM SECTION / FOOTER
      doc
        .strokeColor('#334155')
        .lineWidth(1)
        .moveTo(15, 295)
        .lineTo(585, 295)
        .stroke();

      const issueDateStr = ticket.issuedAt ? new Date(ticket.issuedAt).toUTCString() : new Date().toUTCString();
      doc
        .fontSize(7.5)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text(
          `Event Date: 11/22/2026  |  Issued: ${issueDateStr}  |  Strictly Non-Transferable Single Entry Pass`,
          30,
          308,
          { width: 540 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateTicketPDF,
};
