const db = require('../db');

/**
 * Set a stop-loss order on owned shares
 * When price drops to stop_loss_price, automatically sells
 */
exports.setStopLoss = async (req, res) => {
  const { stock_id, quantity, stop_loss_price } = req.body;
  const userId = req.session.user.user_id;

  try {
    // Get stock price
    const stock = await db.query(
      'SELECT current_price FROM stocks WHERE stock_id = $1',
      [stock_id]
    );

    if (stock.rows.length === 0) {
      throw new Error("Stock not found");
    }

    const currentPrice = stock.rows[0].current_price;

    // Validate stop-loss price is below current price
    if (stop_loss_price >= currentPrice) {
      throw new Error("Stop-loss price must be below current price");
    }

    // Check if user owns enough shares
    const portfolio = await db.query(
      'SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2',
      [userId, stock_id]
    );

    if (portfolio.rows.length === 0 || portfolio.rows[0].quantity < quantity) {
      throw new Error("Not enough shares to set stop-loss");
    }

    // Create stop-loss order (will execute automatically when price drops)
    const result = await db.query(
      `INSERT INTO orders (user_id, stock_id, type, order_type, quantity, price, stop_loss_price, status)
       VALUES ($1, $2, 'SELL', 'STOP-LOSS', $3, $4, $5, 'PENDING')
       RETURNING order_id`,
      [userId, stock_id, quantity, currentPrice, stop_loss_price]
    );

    const orderId = result.rows[0].order_id;

    res.json({ 
      message: `Stop-loss set at ₹${stop_loss_price}. Will auto-sell if price drops below this level.`,
      order_id: orderId,
      status: 'PENDING',
      type: 'STOP-LOSS'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
