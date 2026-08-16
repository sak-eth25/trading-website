const express = require('express');
const router = express.Router();
const { getOrders, getPendingOrders, cancelOrder, getTransactions } = require('../controllers/orderController');
const checkAuth = require('../middleware/authMiddleware');

router.get('/orders', checkAuth, getOrders);
router.get('/pending-orders', checkAuth, getPendingOrders);
router.post('/cancel-order', checkAuth, cancelOrder);
router.get('/transactions', checkAuth, getTransactions);

module.exports = router;