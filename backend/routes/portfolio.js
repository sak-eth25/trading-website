const express = require('express');
const router = express.Router();
const { getPortfolio, getBalance } = require('../controllers/portfolioController');
const checkAuth = require('../middleware/authMiddleware');

router.get('/portfolio', checkAuth, getPortfolio);
router.get('/balance', checkAuth, getBalance);

module.exports = router;