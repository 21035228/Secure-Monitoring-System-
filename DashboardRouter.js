const express = require('express');
const router = express.Router();
const { OAuthDashboardStats } = require('../controllers/DashboardController');

router.route('/stats').post(OAuthDashboardStats);

module.exports = router;