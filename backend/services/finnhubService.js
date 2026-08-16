const { execFile } = require('child_process');
const path = require('path');

/**
 * Fetch current stock price from Yahoo Finance (Indian stocks)
 * Uses yfinance Python library for NSE/BSE stocks
 * @param {string} symbol - Stock symbol (e.g., 'INFY.NS', 'TCS.NS')
 * @returns {Promise<number>} - Current price of the stock
 */
async function getStockPrice(symbol) {
  return new Promise((resolve) => {
    const pythonScript = path.join(__dirname, 'yfinanceService.py');
    
    execFile('python3', [pythonScript, symbol], { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error fetching ${symbol}:`, stderr || error.message);
        resolve(null);
        return;
      }
      
      try {
        const price = parseFloat(stdout.trim());
        if (isNaN(price)) {
          console.warn(`⚠️ Invalid price for ${symbol}`);
          resolve(null);
          return;
        }
        resolve(price);
      } catch (err) {
        console.error(`❌ Error parsing price for ${symbol}:`, err.message);
        resolve(null);
      }
    });
  });
}

/**
 * Fetch multiple stock prices at once
 * @param {array} symbols - Array of stock symbols
 * @returns {Promise<object>} - Object with symbol as key and price as value
 */
async function getMultiplePrices(symbols) {
  try {
    const prices = {};
    
    for (let symbol of symbols) {
      const price = await getStockPrice(symbol);
      if (price) {
        prices[symbol] = price;
      }
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return prices;
  } catch (err) {
    console.error('❌ Error fetching multiple prices:', err.message);
    return {};
  }
}

module.exports = {
  getStockPrice,
  getMultiplePrices
};
