const db = require('../db');
const { spawn } = require('child_process');

exports.getStocks = async (req, res) => {
  const result = await db.query('SELECT * FROM stocks');
  res.json(result.rows);
};

exports.getPriceHistory = async (req, res) => {
  const result = await db.query(
    'SELECT * FROM pricedata WHERE stock_id = $1 ORDER BY recorded_at',
    [req.params.id]
  );
  res.json(result.rows);
};

exports.fetchStockFromYfinance = async (req, res) => {
  const { symbol } = req.body;

  if (!symbol || symbol.trim() === '') {
    return res.status(400).json({ message: 'Stock symbol is required' });
  }

  try {
    // Call Python yfinance to fetch stock data
    const pythonProcess = spawn('python3', ['-c', `
import yfinance as yf
import json
try:
    stock = yf.Ticker('${symbol}')
    info = stock.info
    data = {
        'symbol': '${symbol}',
        'company_name': info.get('longName', '${symbol}'),
        'current_price': float(info.get('currentPrice', 0)) or float(info.get('regularMarketPrice', 0))
    }
    print(json.dumps(data))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const result = JSON.parse(output);
        if (result.error) {
          return res.status(400).json({ message: `Failed to fetch stock data: ${result.error}` });
        }
        res.json(result);
      } catch (e) {
        res.status(500).json({ message: 'Error parsing stock data', error: errorOutput });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock data', error: error.message });
  }
};

exports.addStock = async (req, res) => {
  const { symbol, company_name, current_price } = req.body;

  if (!symbol || !company_name || current_price === undefined) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if stock already exists
    const existing = await db.query(
      'SELECT * FROM stocks WHERE symbol = $1',
      [symbol]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Stock already exists' });
    }

    // Insert new stock
    const result = await db.query(
      'INSERT INTO stocks (symbol, company_name, current_price) VALUES ($1, $2, $3) RETURNING *',
      [symbol, company_name, current_price]
    );

    res.json({ message: 'Stock added successfully', stock: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error adding stock', error: error.message });
  }
};