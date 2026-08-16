const express = require('express');
const router = express.Router();
const { getStocks, getPriceHistory, fetchStockFromYfinance, addStock } = require('../controllers/stockController');

router.get('/stocks', getStocks);
router.get('/stocks/:id/prices', getPriceHistory);
router.get('/price-history/:id', getPriceHistory);
router.post('/stocks/fetch-yfinance', fetchStockFromYfinance);
router.post('/stocks/add', addStock);

module.exports = router;