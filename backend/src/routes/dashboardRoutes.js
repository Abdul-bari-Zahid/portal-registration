const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.use(requireAdminAuth);

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;
