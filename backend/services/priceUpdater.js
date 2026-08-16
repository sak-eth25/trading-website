const db = require('../db');
const { executeBuyOrder, executeSellOrder } = require('../controllers/tradingController');

// Historical replay state
const historicalData = new Map();
const historicalIndex = new Map();

/**
 * Load historical Yahoo Finance prices for all stocks.
 * Uses the OHLCV data already stored in pricedata.
 */
async function loadHistoricalData() {
  try {
    const result = await db.query(`
      SELECT
        p.stock_id,
        p.recorded_at,
        p.close_price
      FROM pricedata p
      WHERE p.source = 'yahoo'
        AND p.close_price IS NOT NULL
      ORDER BY p.stock_id, p.recorded_at ASC
    `);

    historicalData.clear();
    historicalIndex.clear();

    for (const row of result.rows) {
      if (!historicalData.has(row.stock_id)) {
        historicalData.set(row.stock_id, []);
        historicalIndex.set(row.stock_id, 0);
      }

      historicalData.get(row.stock_id).push({
        recorded_at: row.recorded_at,
        price: Number(row.close_price)
      });
    }

    console.log('📊 Historical price data loaded:');

    for (const [stockId, prices] of historicalData.entries()) {
      console.log(`   Stock ${stockId}: ${prices.length} bars`);
    }

  } catch (err) {
    console.error('❌ Error loading historical data:', err.message);
  }
}


/**
 * Get the next historical price for a stock.
 */
function getNextHistoricalPrice(stockId) {
  const prices = historicalData.get(stockId);

  if (!prices || prices.length === 0) {
    return null;
  }

  let index = historicalIndex.get(stockId) || 0;

  // Replay from the beginning again when we reach the end.
  if (index >= prices.length) {
    index = 0;
  }

  const data = prices[index];

  historicalIndex.set(stockId, index + 1);

  return data;
}


/**
 * Check pending orders and execute them if price matches limit.
 */
async function checkPendingOrders(io) {
  try {
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

    for (let order of pendingOrders) {
      try {
        let shouldExecute = false;
        let executionReason = '';

        if (order.type === 'BUY' && order.limit_price) {

          // Limit buy: execute when price <= limit_price
          if (order.current_price <= order.limit_price) {
            shouldExecute = true;
            executionReason = 'Limit price reached';
          }

        } else if (
          order.type === 'SELL' &&
          order.limit_price &&
          !order.stop_loss_price
        ) {

          // Limit sell: execute when price >= limit_price
          if (order.current_price >= order.limit_price) {
            shouldExecute = true;
            executionReason = 'Limit price reached';
          }

        } else if (
          order.type === 'SELL' &&
          order.stop_loss_price &&
          !order.limit_price
        ) {

          // Stop-loss sell: execute when price <= stop_loss_price
          if (order.current_price <= order.stop_loss_price) {
            shouldExecute = true;
            executionReason = 'Stop-loss triggered';
          }
        }

        if (shouldExecute) {

          console.log(
            `⚡ ${executionReason} - Executing ${order.type} order ` +
            `${order.order_id} for ${order.symbol} at ₹${order.current_price}`
          );

          if (order.type === 'BUY') {
            await executeBuyOrder(
              db,
              order.order_id,
              order.user_id,
              order.stock_id,
              order.quantity,
              order.current_price
            );

          } else if (order.type === 'SELL') {
            await executeSellOrder(
              db,
              order.order_id,
              order.user_id,
              order.stock_id,
              order.quantity,
              order.current_price
            );
          }

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
        console.error(
          `❌ Error executing order ${order.order_id}:`,
          err.message
        );
      }
    }

  } catch (err) {
    console.error('❌ Error checking pending orders:', err.message);
  }
}


/**
 * Update all stock prices using historical Yahoo Finance data.
 *
 * Every 30 seconds the next historical 5-minute bar is replayed.
 */
async function updateAllStocks(io) {

  try {

    const cycleStart = Date.now();

    console.log('🔄 Starting historical price replay...');

    // Get all stocks from database
    const result = await db.query(
      'SELECT stock_id, symbol FROM stocks'
    );

    const stocks = result.rows;

    if (stocks.length === 0) {
      console.log('⚠️ No stocks in database');
      return;
    }

    // Load historical data once
    if (historicalData.size === 0) {
      await loadHistoricalData();
    }

    for (const stock of stocks) {

      try {

        const historicalPrice =
          getNextHistoricalPrice(stock.stock_id);

        if (!historicalPrice) {

          console.warn(
            `⚠️ No historical price data for ${stock.symbol}`
          );

          continue;
        }

        const price = historicalPrice.price;

        // Update current simulated market price
        await db.query(
          `UPDATE stocks
           SET current_price = $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE stock_id = $2`,
          [price, stock.stock_id]
        );

        console.log(
          `📈 ${stock.symbol}: ₹${price} ` +
          `(historical: ${historicalPrice.recorded_at})`
        );

        // Send price to frontend
        io.emit('priceUpdate', {
          stock_id: stock.stock_id,
          symbol: stock.symbol,
          price: price,
          timestamp: new Date(),
          historical_timestamp: historicalPrice.recorded_at
        });

      } catch (err) {

        console.error(
          `❌ Error updating ${stock.symbol}:`,
          err.message
        );
      }
    }

    // Keep existing order execution logic
    await checkPendingOrders(io);

    const totalTime = Date.now() - cycleStart;

    console.log(
      `✅ Historical replay cycle completed in ${totalTime}ms\n`
    );

  } catch (err) {

    console.error(
      '❌ Error in updateAllStocks:',
      err.message
    );
  }
}


/**
 * Start historical price replay.
 *
 * Every 30 seconds the next historical bar is replayed.
 */
function startPriceUpdater(io) {

  // Load historical data first
  loadHistoricalData().then(() => {

    console.log(
      '✅ Historical price replay started'
    );

    console.log(
      '⏱️ Advancing one historical 5-minute bar every 30 seconds'
    );

    // First update immediately
    updateAllStocks(io);

    // Continue every 30 seconds
    setInterval(() => {
      updateAllStocks(io);
    }, 30000);

  });

}


module.exports = startPriceUpdater;