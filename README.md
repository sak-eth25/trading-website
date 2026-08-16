# Quantitative Trading Platform

A quantitative trading and research platform combining historical market-data analysis, systematic strategy development, backtesting, simulated trading, portfolio management, and risk analytics.

## Features

### Market Data
- Historical OHLCV data from Yahoo Finance
- 5-minute historical price data
- PostgreSQL time-series storage
- Historical price replay for simulated trading
- NSE instruments including `RELIANCE.NS`, `TCS.NS`, `INFY.NS`, `HDFCBANK.NS`, and `ICICIBANK.NS`
- Indexed time-series queries

### Trading Engine
- Market orders
- Limit orders
- Stop-loss orders
- Buy/sell execution
- Balance management
- Portfolio holdings
- Average purchase price calculation
- Transaction history
- Trade records
- Pending-order monitoring

### Historical Price Simulation

The platform can replay historical market data as simulated live prices:

```text
Historical OHLCV
       ↓
PostgreSQL
       ↓
Historical Price Replay
       ↓
Current Simulated Price
       ↓
Socket.IO
       ↓
Trading Interface
```

A historical 5-minute bar is advanced every 30 seconds, allowing simulated trading even when the market is closed.

---

# Quantitative Research

The quantitative component is implemented primarily in Python, with a C++ quantitative engine for computational experimentation.

```text
Historical OHLCV
       ↓
Data Processing
       ↓
Returns
       ↓
Rolling Statistics
       ↓
Trading Signals
       ↓
Positions
       ↓
Backtesting
       ↓
Performance & Risk Analysis
```

## Current Strategy: Mean Reversion

The current systematic strategy is a z-score based mean-reversion strategy.

Rolling mean:

\[
\mu_t = \frac{1}{N}\sum_{i=0}^{N-1}P_{t-i}
\]

Rolling standard deviation:

\[
\sigma_t =
\sqrt{\frac{1}{N}\sum_{i=0}^{N-1}(P_{t-i}-\mu_t)^2}
\]

Z-score:

\[
Z_t = \frac{P_t-\mu_t}{\sigma_t}
\]

The strategy uses configurable z-score thresholds to generate long, short, and flat positions.

---

# Backtesting

The backtester evaluates systematic strategies on historical OHLCV data.

It includes:

- Historical data loading
- Return calculation
- Rolling indicators
- Signal generation
- Position generation
- Lagged execution
- Transaction costs
- Slippage
- Equity curve generation
- Performance metrics
- Trade statistics

## Look-Ahead Bias Prevention

Signals are shifted before calculating strategy returns:

```text
Price at t
   ↓
Signal at t
   ↓
Execute at t+1
```

This prevents the strategy from using information from the current bar to profit from the same bar's return.

## Transaction Costs

Turnover:

\[
Turnover_t = |w_t-w_{t-1}|
\]

Strategy returns incorporate transaction costs and slippage:

\[
R_t^{strategy}
=
w_{t-1}R_t
-
Turnover_t(C_{transaction}+C_{slippage})
\]

---

# Performance Metrics

The backtesting engine currently calculates:

- Total Return
- Annualized Return
- Volatility
- Sharpe Ratio
- Sortino Ratio
- Maximum Drawdown
- Win Rate
- Profit Factor
- Approximate Round Trips

### Sharpe Ratio

\[
Sharpe =
\frac{E[R-R_f]}{\sigma_R}\sqrt{N}
\]

### Sortino Ratio

\[
Sortino =
\frac{E[R-R_f]}{\sigma_{downside}}\sqrt{N}
\]

### Maximum Drawdown

\[
DD_t =
\frac{C_t-Peak_t}{Peak_t}
\]

---

# Example Backtest

Current RELIANCE.NS test:

```text
============================================================
BACKTEST: RELIANCE.NS
============================================================

Bars: 364

PERFORMANCE
----------------------------------------
initial_capital     : 100000.0000
final_capital       : 100214.4393
total_return        : 0.21%
annualized_return   : 11.76%
volatility          : 12.50%
sharpe              : 0.9521
sortino             : 0.9068
max_drawdown        : -1.97%
win_rate            : 20.33%
profit_factor       : 1.0385

TRADES
Approx. round trips: 8
```

These results are a validation of the current research/backtesting pipeline. The dataset and number of trades are too small to establish a statistically robust trading edge.

---

# Architecture

```text
                    +------------------+
                    | Historical Data  |
                    |  Yahoo Finance   |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   PostgreSQL     |
                    | OHLCV + Trading  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
     +------------------+          +------------------+
     | Python Quant     |          | Node.js Backend  |
     | Research         |          | Trading Engine   |
     +--------+---------+          +--------+---------+
              |                             |
              v                             v
     +------------------+          +------------------+
     | Strategy         |          | Orders           |
     | Backtesting      |          | Portfolio        |
     | Risk Analytics   |          | Transactions     |
     +--------+---------+          +--------+---------+
              |                             |
              +--------------+--------------+
                             |
                             v
                    +------------------+
                    | Performance /    |
                    | Trading Results  |
                    +------------------+
```

---

# Database

Main PostgreSQL entities:

| Table | Purpose |
|---|---|
| `users` | User accounts and balances |
| `stocks` | Instrument information and current simulated prices |
| `pricedata` | Historical price observations |
| `orders` | Submitted and pending orders |
| `trades` | Executed trades |
| `portfolio` | Current holdings |
| `transactions` | Transaction history |

Time-series data is indexed with:

```sql
CREATE INDEX IF NOT EXISTS idx_pricedata_stock_time
ON pricedata(stock_id, recorded_at);
```

---

# Project Structure

```text
Project/
│
├── backend/
│   ├── app.js
│   ├── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── portfolioController.js
│   │   ├── quantController.js
│   │   ├── stockController.js
│   │   ├── stopLossController.js
│   │   └── tradingController.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── orders.js
│   │   ├── portfolio.js
│   │   ├── quant.js
│   │   ├── stocks.js
│   │   └── trading.js
│   │
│   ├── services/
│   │   ├── finnhubService.js
│   │   ├── priceUpdater.js
│   │   ├── socketService.js
│   │   └── yfinanceService.py
│   │
│   ├── quant/
│   │   ├── quant_engine.py
│   │   ├── requirements.txt
│   │   ├── README.md
│   │   └── cpp/
│   │       ├── quant_engine.cpp
│   │       └── Makefile
│   │
│   └── migrations/
│       └── add_limit_orders.sql
│
└── README.md
```

---

# Technology Stack

| Area | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Quant Research | Python |
| Data Analysis | Pandas, NumPy |
| Market Data | Yahoo Finance / yfinance |
| Quantitative Computation | C++ |
| Real-Time Communication | Socket.IO |
| Environment | Linux |

---

# Running the Project

## Backend

```bash
cd backend
npm install
node app.js
```

Backend:

```text
http://localhost:4000
```

## Python Environment

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

pip install -r quant/requirements.txt
```

## Test Yahoo Finance

```bash
python services/yfinanceService.py RELIANCE.NS
```

## Run Backtest

```bash
python quant/backtest.py RELIANCE.NS
```

Results are written to:

```text
quant/results_RELIANCE_NS.csv
```

---

# Quantitative Concepts Covered

- Financial market data
- OHLCV data
- Simple returns
- Time-series analysis
- Rolling statistics
- Mean reversion
- Z-scores
- Trading signals
- Long/short positions
- Backtesting
- Look-ahead bias
- Transaction costs
- Slippage
- Turnover
- Equity curves
- Volatility
- Sharpe ratio
- Sortino ratio
- Maximum drawdown
- Win rate
- Profit factor
- Portfolio management
- Order execution
- Historical market simulation

---

# Limitations

This is a research and simulated-trading platform rather than a production brokerage.

Current limitations include:

- Relatively small historical dataset
- Limited number of instruments
- One primary quantitative strategy
- No walk-forward validation yet
- No dedicated out-of-sample evaluation yet
- No portfolio optimization yet
- No VaR / Expected Shortfall yet
- Yahoo Finance is used for research data rather than exchange-grade execution
- Current backtest results should not be interpreted as proof of profitability

---

# Future Quant Extensions

### Strategies
- Momentum
- Moving-average strategies
- Pairs trading
- Statistical arbitrage
- Factor-based strategies
- Market-neutral strategies

### Risk
- Value at Risk
- Expected Shortfall
- Beta
- Alpha
- Portfolio volatility
- Risk-based position sizing

### Research
- Train/test splits
- Walk-forward validation
- Parameter sensitivity analysis
- Out-of-sample testing
- Monte Carlo simulation
- Robustness testing

### Portfolio
- Multi-asset portfolio construction
- Mean-variance optimization
- Risk parity
- Correlation analysis
- Position sizing

---

# Disclaimer

This project is intended for educational, research, and simulated-trading purposes.

Backtested performance does not guarantee future results. The current dataset is limited, and the reported strategy performance should not be interpreted as evidence of a real-world trading edge.

## Project Goal

The long-term goal is to evolve the platform into a quantitative research and algorithmic trading framework where strategies can be developed, tested, evaluated, and compared systematically.
