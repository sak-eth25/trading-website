const db = require('../db');
const finnhubService = require('./finnhubService');
const { executeBuyOrder, executeSellOrder } = require('../controllers/tradingController');

/**
 * Check pending orders and execute them if price matches limit
 * @param {object} io - Socket.io instance
 */
async function checkPendingOrders(io) {
  try {
    // Get all pending orders
    const result = await db.query(
      `SELECT o.*, s.current_price, s.symbol
       FROM orders o
       JOIN stocks s ON o.stock_id = s.stock_id
       WHERE o.status = 'PENDING'
       ORDER BY o.created_at ASC`
    );

    const pendingOrders = result.rows;

    if (pendingOrders.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${pendingOrders.length} pending orders...`);

    // Check each order
    for (let order of pendingOrders) {
      try {
        // Determine if order should execute
        let shouldExecute = false;
        let executionReason = '';

        if (order.type === 'BUY' && order.limit_price) {
          // Limit buy: execute when price ≤ limit_price
          if (order.current_price <= order.limit_price) {
            shouldExecute = true;
            executionReason = 'Limit price reached';
          }
        } else if (order.type === 'SELL' && order.limit_price && !order.stop_loss_price) {
          // Limit sell: execute when price ≥ limit_price
          if (order.current_price >= order.limit_price) {
            shouldExecute = true;
            executionReason = 'Limit price reached';
          }
        } else if (order.type === 'SELL' && order.stop_loss_price && !order.limit_price) {
          // Stop-loss sell: execute when price ≤ stop_loss_price
          if (order.current_price <= order.stop_loss_price) {
            shouldExecute = true;
            executionReason = 'Stop-loss triggered';
          }
        }

        if (shouldExecute) {
          console.log(`⚡ ${executionReason} - Executing ${order.type} order ${order.order_id} for ${order.symbol} at ₹${order.current_price}`);

          if (order.type === 'BUY') {
            await executeBuyOrder(db, order.order_id, order.user_id, order.stock_id, order.quantity, order.current_price);
          } else if (order.type === 'SELL') {
            await executeSellOrder(db, order.order_id, order.user_id, order.stock_id, order.quantity, order.current_price);
          }

          // Emit event to notify user
          io.emit('orderExecuted', {
            order_id: order.order_id,
            type: order.type,
            symbol: order.symbol,
            quantity: order.quantity,
            executed_price: order.current_price,
            reason: executionReason,
            timestamp: new Date()
          });
        }
      } catch (err) {
        console.error(`❌ Error executing order ${order.order_id}:`, err.message);
      }
    }

  } catch (err) {
    console.error('❌ Error checking pending orders:', err.message);
  }
}

/**
 * Update all stock prices from Finnhub API and emit to connected clients
 * @param {object} io - Socket.io instance
 */
async function updateAllStocks(io) {
  try {
    const cycleStart = Date.now();
    console.log('🔄 Starting price update cycle...');

    // Get all stocks from database
    const result = await db.query('SELECT stock_id, symbol FROM stocks');
    const stocks = result.rows;

    if (stocks.length === 0) {
      console.log('⚠️ No stocks in database');
      return;
    }

    const apiStart = Date.now();
    // Fetch prices for all stocks
    for (let stock of stocks) {
      try {
        const price = await finnhubService.getStockPrice(stock.symbol);

        if (price === null) {
          console.warn(`⚠️ Skipping ${stock.symbol} - no price data`);
          continue;
        }

        // Update stocks table with new current_price
        await db.query(
          'UPDATE stocks SET current_price = $1, last_updated = CURRENT_TIMESTAMP WHERE stock_id = $2',
          [price, stock.stock_id]
        );

        // Insert into pricedata table for history/charts
        await db.query(
          'INSERT INTO pricedata (stock_id, price) VALUES ($1, $2)',
          [stock.stock_id, price]
        );

        console.log(`✅ Updated ${stock.symbol}: $${price}`);

        // Emit to all connected clients
        io.emit('priceUpdate', {
          stock_id: stock.stock_id,
          symbol: stock.symbol,
          price: price,
          timestamp: new Date()
        });

      } catch (err) {
        console.error(`❌ Error updating ${stock.symbol}:`, err.message);
      }
    }
    const apiTime = Date.now() - apiStart;
    console.log(`⏱️ API + DB updates: ${apiTime}ms`);

    // After updating all prices, check pending orders
    const orderStart = Date.now();
    await checkPendingOrders(io);
    const orderTime = Date.now() - orderStart;
    console.log(`⏱️ Order checking: ${orderTime}ms`);

    const totalTime = Date.now() - cycleStart;
    console.log(`✅ Price update cycle completed in ${totalTime}ms\n`);

  } catch (err) {
    console.error('❌ Error in updateAllStocks:', err.message);
  }
}

/**
 * Start the price updater service with interval scheduling
 * Updates prices every 30 seconds and checks pending orders
 * More reliable than cron for frequent tasks
 * @param {object} io - Socket.io instance
 */
function startPriceUpdater(io) {
  // Schedule: Every 30 seconds using setInterval (30,000ms)
  setInterval(() => {
    updateAllStocks(io);
  }, 30000);

  console.log('✅ Price updater service started (updates every 30 seconds)');

  // Also run once immediately when service starts
  updateAllStocks(io);
}

module.exports = startPriceUpdater;
