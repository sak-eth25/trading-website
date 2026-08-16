# Quantitative Trading & Portfolio Research Platform

This project extends the original trading application into a systematic-trading research platform while preserving its existing account, order, portfolio and market-data functionality.

## Quant layer

- Historical price research
- Z-score mean-reversion strategy
- Time-series momentum strategy
- Backtesting with one-bar signal lag to avoid basic look-ahead bias
- Transaction-cost modelling
- Slippage modelling
- Equity curves
- Sharpe and Sortino ratios
- Volatility
- Maximum drawdown
- Historical 95% VaR
- Expected Shortfall
- Turnover and estimated transaction costs
- Standalone C++ research engine for performance-oriented experimentation

## Run

### Backend

```bash
cd backend
npm install
node app.js
```

The quant API requires Python 3 and the packages in `backend/quant/requirements.txt`.

```bash
python3 -m pip install -r quant/requirements.txt
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **Quant Lab** after logging in.

## Quant API

- `GET /quant/strategies`
- `GET /quant/research-data/:id`
- `POST /quant/backtest`
- `POST /quant/backtest/:id`

Example body for `/quant/backtest`:

```json
{
  "strategy": "mean_reversion",
  "params": {"window": 20, "entry_z": 1.5, "exit_z": 0.25},
  "initial_capital": 100000,
  "fee_bps": 5,
  "slippage_bps": 2,
  "data": [
    {"timestamp": "2026-01-01T09:15:00Z", "price": 100.0},
    {"timestamp": "2026-01-01T09:16:00Z", "price": 101.0}
  ]
}
```

## Next quantitative extensions

1. Pairs trading / statistical arbitrage
2. Covariance estimation and constrained portfolio optimization
3. Walk-forward / out-of-sample evaluation
4. Monte Carlo/bootstrap stress testing
5. Order-book and market-impact simulation
6. C++ execution engine integrated with the research API
