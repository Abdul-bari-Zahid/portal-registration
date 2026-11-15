const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { revokeTicketValidators } = require('../validation/validators');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// All ticket management routes require admin auth
router.use(requireAdminAuth);

router.get('/', ticketController.listTickets);
router.get('/:id', ticketController.getTicketById);
router.get('/:id/print-data', ticketController.getTicketPrintData);
router.get('/:id/download-pdf', ticketController.downloadTicketPdf);
router.patch('/:id/mark-sent', ticketController.markAsSent);
router.patch(
  '/:id/revoke',
  revokeTicketValidators,
  handleValidationErrors,
  ticketController.revokeTicket
);

module.exports = router;
