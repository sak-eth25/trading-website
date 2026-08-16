const db = require('../db');
const { spawn } = require('child_process');
const path = require('path');

function runPythonEngine(payload) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, '..', 'quant', 'quant_engine.py');
    const proc = spawn('python3', [script]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    proc.on('error', reject);
    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(stderr || `Quant engine exited with code ${code}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch (err) {
        reject(new Error(`Invalid quant engine response: ${stdout}`));
      }
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

exports.getResearchData = async (req, res) => {
  try {
    const stockId = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit || 5000), 10000);
    const result = await db.query(
      `SELECT recorded_at, price
       FROM pricedata
       WHERE stock_id = $1
       ORDER BY recorded_at ASC
       LIMIT $2`,
      [stockId, limit]
    );
    res.json(result.rows.map(r => ({ timestamp: r.recorded_at, price: Number(r.price) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.backtest = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!Array.isArray(payload.data) || payload.data.length < 5) {
      return res.status(400).json({ error: 'At least 5 observations are required' });
    }
    const result = await runPythonEngine(payload);
    res.json(result);
  } catch (err) {
    console.error('Quant backtest error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.backtestStock = async (req, res) => {
  try {
    const stockId = Number(req.params.id);
    const limit = Math.min(Number(req.body.limit || 5000), 10000);
    const result = await db.query(
      `SELECT recorded_at, price
       FROM pricedata
       WHERE stock_id = $1
       ORDER BY recorded_at ASC
       LIMIT $2`,
      [stockId, limit]
    );

    if (result.rows.length < 5) {
      return res.status(400).json({
        error: 'Not enough historical observations. Let the price updater collect more data first.'
      });
    }

    const payload = {
      ...req.body,
      data: result.rows.map(r => ({ timestamp: r.recorded_at, price: Number(r.price) }))
    };
    const backtest = await runPythonEngine(payload);
    res.json(backtest);
  } catch (err) {
    console.error('Stock backtest error:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.getStrategyInfo = async (_req, res) => {
  res.json({
    strategies: [
      {
        id: 'mean_reversion',
        name: 'Z-Score Mean Reversion',
        description: 'Trades deviations from a rolling mean and exits when the spread normalizes.',
        parameters: { window: 20, entry_z: 1.5, exit_z: 0.25 }
      },
      {
        id: 'momentum',
        name: 'Time-Series Momentum',
        description: 'Takes long/short exposure based on the direction of a historical lookback return.',
        parameters: { lookback: 10 }
      }
    ],
    notes: [
      'Signals are shifted by one observation before returns are applied.',
      'Transaction costs and slippage are included in reported net returns.',
      'This is a research/paper-trading engine, not a production execution system.'
    ]
  });
};
