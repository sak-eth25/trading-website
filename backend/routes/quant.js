const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/authMiddleware');
const {
  getResearchData,
  backtest,
  backtestStock,
  getStrategyInfo
} = require('../controllers/quantController');

router.get('/quant/strategies', checkAuth, getStrategyInfo);
router.get('/quant/research-data/:id', checkAuth, getResearchData);
router.post('/quant/backtest', checkAuth, backtest);
router.post('/quant/backtest/:id', checkAuth, backtestStock);

module.exports = router;
