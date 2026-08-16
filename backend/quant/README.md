# Quant Research Engine

This module adds a research/backtesting layer to the original trading platform.

## Current strategies

- Z-score mean reversion
- Time-series momentum

## Backtest safeguards

- Signals are shifted one observation before the next return is applied.
- Transaction costs are expressed in basis points.
- Slippage is explicitly modelled.
- Position leverage is bounded by the request.

## Risk metrics

- Total return
- Annualized return
- Annualized volatility
- Sharpe ratio
- Sortino ratio
- Maximum drawdown
- 95% historical VaR
- 95% expected shortfall
- Turnover
- Estimated transaction costs

## API

- `GET /quant/strategies`
- `GET /quant/research-data/:id`
- `POST /quant/backtest`
- `POST /quant/backtest/:id`

The engine is intentionally a research/paper-trading component. It should not be interpreted as a production trading system or as evidence of profitable live trading.
