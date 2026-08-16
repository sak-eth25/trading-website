const db = require('../db');

/**
 * Place a buy order (market or limit)
 * Market orders: execute immediately at current price
 * Limit orders: wait for price to reach limit_price, then execute
 */
exports.buyStock = async (req, res) => {
  const { stock_id, quantity, limit_price } = req.body;
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
    
    // Determine if this is a market or limit order
    const isMarketOrder = !limit_price;
    const orderPrice = isMarketOrder ? currentPrice : limit_price;
    const orderType = isMarketOrder ? 'MARKET' : 'LIMIT';
    const estTotal = orderPrice * quantity;

    // Check balance for estimated cost
    const user = await db.query(
      'SELECT balance FROM users WHERE user_id = $1',
      [userId]
    );

    if (user.rows[0].balance < estTotal) {
      throw new Error("Insufficient balance for this order");
    }

    // Insert pending order
    const result = await db.query(
      `INSERT INTO orders (user_id, stock_id, type, order_type, quantity, price, limit_price, status)
       VALUES ($1, $2, 'BUY', $3, $4, $5, $6, 'PENDING')
       RETURNING order_id, status`,
      [userId, stock_id, orderType, quantity, currentPrice, limit_price || null]
    );

    const orderId = result.rows[0].order_id;

    // If market order, execute immediately
    if (isMarketOrder) {
      await executeBuyOrder(db, orderId, userId, stock_id, quantity, currentPrice);
    }

    res.json({ 
      message: isMarketOrder ? "Buy order executed" : "Buy order placed (pending)",
      order_id: orderId,
      status: isMarketOrder ? 'EXECUTED' : 'PENDING',
      type: orderType
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Place a sell order (market or limit)
 */
exports.sellStock = async (req, res) => {
  const { stock_id, quantity, limit_price } = req.body;
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

    // Check if user has enough shares
    const portfolio = await db.query(
      'SELECT quantity FROM portfolio WHERE user_id = $1 AND stock_id = $2',
      [userId, stock_id]
    );

    if (portfolio.rows.length === 0 || portfolio.rows[0].quantity < quantity) {
      throw new Error("Not enough shares to sell");
    }

    // Determine if this is a market or limit order
    const isMarketOrder = !limit_price;
    const orderType = isMarketOrder ? 'MARKET' : 'LIMIT';

    // Insert pending order
    const result = await db.query(
      `INSERT INTO orders (user_id, stock_id, type, order_type, quantity, price, limit_price, status)
       VALUES ($1, $2, 'SELL', $3, $4, $5, $6, 'PENDING')
       RETURNING order_id, status`,
      [userId, stock_id, orderType, quantity, currentPrice, limit_price || null]
    );

    const orderId = result.rows[0].order_id;

    // If market order, execute immediately
    if (isMarketOrder) {
      await executeSellOrder(db, orderId, userId, stock_id, quantity, currentPrice);
    }

    res.json({ 
      message: isMarketOrder ? "Sell order executed" : "Sell order placed (pending)",
      order_id: orderId,
      status: isMarketOrder ? 'EXECUTED' : 'PENDING',
      type: orderType
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Execute a buy order (called by market orders or price matcher)
 */
async function executeBuyOrder(db, orderId, userId, stockId, quantity, executionPrice) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const total = executionPrice * quantity;

    // Deduct balance
    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE user_id = $2',
      [total, userId]
    );

    // Update order with execution details
    await client.query(
      `UPDATE orders SET status = 'EXECUTED', executed_price = $1 
       WHERE order_id = $2`,
      [executionPrice, orderId]
    );

    // Insert trade record
    await client.query(
      `INSERT INTO trades (order_id, executed_price, quantity)
       VALUES ($1, $2, $3)`,
      [orderId, executionPrice, quantity]
    );

    // Update portfolio with correct average price calculation
    const existingPortfolio = await client.query(
      'SELECT quantity, avg_price FROM portfolio WHERE user_id = $1 AND stock_id = $2',
      [userId, stockId]
    );

    let newAvgPrice = executionPrice;
    if (existingPortfolio.rows.length > 0) {
      const existing = existingPortfolio.rows[0];
      newAvgPrice = (existing.avg_price * existing.quantity + executionPrice * quantity) / (existing.quantity + quantity);
    }

    await client.query(
      `INSERT INTO portfolio (user_id, stock_id, quantity, avg_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, stock_id)
       DO UPDATE SET quantity = portfolio.quantity + $3, avg_price = $4`,
      [userId, stockId, quantity, newAvgPrice]
    );

    // Insert transaction
    await client.query(
      `INSERT INTO transactions (user_id, stock_id, type, quantity, price, amount)
       VALUES ($1, $2, 'BUY', $3, $4, $5)`,
      [userId, stockId, quantity, executionPrice, -total]
    );

    await client.query('COMMIT');
    console.log(`✅ BUY order ${orderId} executed at $${executionPrice}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Error executing buy order ${orderId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a sell order (called by market orders or price matcher)
 */
async function executeSellOrder(db, orderId, userId, stockId, quantity, executionPrice) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const total = executionPrice * quantity;

    // Add balance
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE user_id = $2',
      [total, userId]
    );

    // Update order with execution details
    await client.query(
      `UPDATE orders SET status = 'EXECUTED', executed_price = $1 
       WHERE order_id = $2`,
      [executionPrice, orderId]
    );

    // Insert trade record
    await client.query(
      `INSERT INTO trades (order_id, executed_price, quantity)
       VALUES ($1, $2, $3)`,
      [orderId, executionPrice, quantity]
    );

    // Reduce portfolio
    await client.query(
      `UPDATE portfolio 
       SET quantity = quantity - $1
       WHERE user_id = $2 AND stock_id = $3`,
      [quantity, userId, stockId]
    );

    // Insert transaction
    await client.query(
      `INSERT INTO transactions (user_id, stock_id, type, quantity, price, amount)
       VALUES ($1, $2, 'SELL', $3, $4, $5)`,
      [userId, stockId, quantity, executionPrice, total]
    );

    await client.query('COMMIT');
    console.log(`✅ SELL order ${orderId} executed at $${executionPrice}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Error executing sell order ${orderId}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports.executeBuyOrder = executeBuyOrder;
module.exports.executeSellOrder = executeSellOrder;