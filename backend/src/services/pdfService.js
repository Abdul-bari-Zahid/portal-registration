const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateQRCodeBuffer } = require('./qrService');
const config = require('../config/config');

/**
 * Generates a clean, professional event ticket as a standard A4 PDF.
 * Designed to fit mobile screens perfectly without black borders or tiny thumbnails.
 */
const generateTicketPDF = async ({ registration, ticket, rawToken }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Standard A4 Portrait: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Generate QR Code buffer
      let qrBuffer;
      if (rawToken) {
        qrBuffer = await generateQRCodeBuffer(rawToken);
      } else {
        qrBuffer = await generateQRCodeBuffer(ticket.qrTokenHash);
      }

      const cardX = 30;
      const cardY = 40;
      const cardWidth = 535;
      const cardHeight = 490;

      // 1. Outer Ticket Card Background & Subtle Border
      doc
        .roundedRect(cardX, cardY, cardWidth, cardHeight, 16)
        .fillAndStroke('#ffffff', '#cbd5e1');

      // 2. Header Accent Band
      doc
        .roundedRect(cardX, cardY, cardWidth, 68, 16)
        .fill('#f8fafc');
      // Fill bottom corners of header to keep divider flat
      doc
        .rect(cardX, cardY + 50, cardWidth, 18)
        .fill('#f8fafc');

      // Header Divider Line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(cardX, cardY + 68)
        .lineTo(cardX + cardWidth, cardY + 68)
        .stroke();

      // Logo or Emblem
      const logoPath = path.join(__dirname, '../assets/uraan-logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, cardX + 16, cardY + 12, { width: 44, height: 44 });
        } catch (_) {}
      }

      // Event Title
      const textLeft = fs.existsSync(logoPath) ? cardX + 68 : cardX + 20;
      doc
        .fontSize(16)
        .fillColor('#1e1b4b')
        .font('Helvetica-Bold')
        .text('URAAN TRIP 2026', textLeft, cardY + 16);

      doc
        .fontSize(9.5)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('Official Admission & Gate Pass', textLeft, cardY + 38);

      // Event Date Pill on Right
      const datePillWidth = 145;
      const datePillX = cardX + cardWidth - datePillWidth - 16;
      doc
        .roundedRect(datePillX, cardY + 18, datePillWidth, 30, 8)
        .fillAndStroke('#eff6ff', '#bfdbfe');

      doc
        .fontSize(8.5)
        .fillColor('#1d4ed8')
        .font('Helvetica-Bold')
        .text('EVENT DATE: 11/22/2026', datePillX, cardY + 28, {
          width: datePillWidth,
          align: 'center',
        });

      // 3. ATTENDEE & TICKET DETAILS (LEFT SECTION)
      const contentY = cardY + 85;
      const leftColX = cardX + 24;

      // Attendee Name
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('ATTENDEE NAME', leftColX, contentY);
      doc
        .fontSize(15)
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .text(registration.fullName || 'N/A', leftColX, contentY + 12);

      // Row 2: Registration ID & Ticket ID
      const row2Y = contentY + 44;
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('REGISTRATION ID', leftColX, row2Y);
      doc
        .fontSize(11)
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .text(registration.registrationId, leftColX, row2Y + 12);

      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('TICKET ID', leftColX + 160, row2Y);
      doc
        .fontSize(11)
        .fillColor('#6366f1')
        .font('Helvetica-Bold')
        .text(ticket.ticketId, leftColX + 160, row2Y + 12);

      // Row 3: Department & Phone Number
      const row3Y = row2Y + 42;
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('DEPARTMENT', leftColX, row3Y);
      doc
        .fontSize(10.5)
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .text(registration.department || 'N/A', leftColX, row3Y + 12);

      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('PHONE NUMBER', leftColX + 160, row3Y);
      doc
        .fontSize(10.5)
        .fillColor('#1e293b')
        .font('Helvetica')
        .text(registration.phoneNumber || 'N/A', leftColX + 160, row3Y + 12);

      // Row 4: Email Address & Payment Status
      const row4Y = row3Y + 40;
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('EMAIL ADDRESS', leftColX, row4Y);
      doc
        .fontSize(9.5)
        .fillColor('#1e293b')
        .font('Helvetica')
        .text(registration.email || 'N/A', leftColX, row4Y + 12, { width: 155 });

      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica-Bold')
        .text('PAYMENT STATUS', leftColX + 160, row4Y);
      doc
        .fontSize(10)
        .fillColor('#15803d') // Emerald
        .font('Helvetica-Bold')
        .text('APPROVED (VERIFIED)', leftColX + 160, row4Y + 12);

      // 4. RIGHT SECTION: Large QR Code with Border
      const qrBoxX = cardX + cardWidth - 175;
      const qrBoxY = contentY;

      doc
        .roundedRect(qrBoxX, qrBoxY, 155, 155, 10)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc.image(qrBuffer, qrBoxX + 10, qrBoxY + 10, {
        width: 135,
        height: 135,
      });

      doc
        .fontSize(9.5)
        .fillColor('#4338ca')
        .font('Helvetica-Bold')
        .text('SCAN FOR ENTRY', qrBoxX, qrBoxY + 165, { width: 155, align: 'center' });

      doc
        .fontSize(8)
        .fillColor('#64748b')
        .font('Helvetica')
        .text('One Ticket • One Entry', qrBoxX, qrBoxY + 180, { width: 155, align: 'center' });

      // 5. GUIDELINES BOX (3 RULES IN ENGLISH)
      const rulesY = row4Y + 50;
      doc
        .roundedRect(leftColX, rulesY, cardWidth - 48, 86, 8)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      doc
        .fontSize(8.5)
        .fillColor('#1e1b4b')
        .font('Helvetica-Bold')
        .text('ADMISSION & SECURITY GUIDELINES:', leftColX + 12, rulesY + 10);

      doc
        .fontSize(8)
        .fillColor('#334155')
        .font('Helvetica')
        .text('1. This ticket is strictly valid for ONE-TIME entry scan only.', leftColX + 12, rulesY + 28)
        .text('2. Do not share or forward your ticket or QR code to anyone.', leftColX + 12, rulesY + 44)
        .text('3. Please present your valid student ID card along with this pass at the gate.', leftColX + 12, rulesY + 60);

      // 6. CARD FOOTER
      const footerY = cardY + cardHeight - 34;
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(cardX, footerY)
        .lineTo(cardX + cardWidth, footerY)
        .stroke();

      const issueDateStr = ticket.issuedAt
        ? new Date(ticket.issuedAt).toLocaleString()
        : new Date().toLocaleString();

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text(
          `Official Digital Pass  •  Issued: ${issueDateStr}  •  Strictly Non-Transferable Single Entry`,
          cardX + 20,
          footerY + 12,
          { width: cardWidth - 40, align: 'center' }
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
