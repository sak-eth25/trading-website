const db = require('../db');

/**
 * Get all orders for a user (both PENDING and EXECUTED)
 */
exports.getOrders = async (req, res) => {
  const userId = req.session.user.user_id;

  const result = await db.query(
    `SELECT o.*, s.symbol
     FROM orders o
     JOIN stocks s ON o.stock_id = s.stock_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );

  res.json(result.rows);
};

/**
 * Get pending orders for a user
 */
exports.getPendingOrders = async (req, res) => {
  const userId = req.session.user.user_id;

  const result = await db.query(
    `SELECT o.*, s.symbol, s.current_price
     FROM orders o
     JOIN stocks s ON o.stock_id = s.stock_id
     WHERE o.user_id = $1 AND o.status = 'PENDING'
     ORDER BY o.created_at DESC`,
    [userId]
  );

  res.json(result.rows);
};

/**
 * Cancel a pending order
 */
exports.cancelOrder = async (req, res) => {
  const { order_id } = req.body;
  const userId = req.session.user.user_id;

  try {
    // Check if order exists and belongs to user
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2',
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Can only cancel PENDING orders
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel ${order.status} order` });
    }

    // Update order status to CANCELLED
    await db.query(
      'UPDATE orders SET status = $1 WHERE order_id = $2',
      ['CANCELLED', order_id]
    );

    res.json({ message: "Order cancelled successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get transaction history
 */
exports.getTransactions = async (req, res) => {
  const userId = req.session.user.user_id;

  const result = await db.query(
    `SELECT t.*, s.symbol 
     FROM transactions t
     JOIN stocks s ON t.stock_id = s.stock_id
     WHERE t.user_id = $1 
     ORDER BY t.created_at DESC`,
    [userId]
  );

  res.json(result.rows);
};