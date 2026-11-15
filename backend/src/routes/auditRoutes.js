const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.use(requireAdminAuth);

router.get('/', auditController.getAuditLogs);

module.exports = router;
