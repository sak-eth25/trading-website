const express = require('express');
const router = express.Router();
const { buyStock, sellStock } = require('../controllers/tradingController');
const { setStopLoss } = require('../controllers/stopLossController');
const checkAuth = require('../middleware/authMiddleware');

router.post('/buy', checkAuth, buyStock);
router.post('/sell', checkAuth, sellStock);
router.post('/stop-loss', checkAuth, setStopLoss);

module.exports = router;