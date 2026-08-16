#!/usr/bin/env python3
"""Small, dependency-light quantitative research engine.

Input: JSON on stdin with a list of {timestamp, price} observations and strategy params.
Output: JSON containing equity curve, trades, and risk/performance statistics.

The engine deliberately shifts positions by one observation so signals are not
executed using the same close that created the signal (avoids simple look-ahead bias).
"""
import json
import math
import statistics
import sys
from typing import List, Dict, Tuple


def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def stdev(xs):
    if len(xs) < 2:
        return 0.0
    return statistics.stdev(xs)


def returns(prices):
    out = [0.0]
    for i in range(1, len(prices)):
        prev = prices[i - 1]
        out.append((prices[i] / prev - 1.0) if prev else 0.0)
    return out


def rolling_stats(values, window):
    means, stds = [], []
    for i in range(len(values)):
        w = values[max(0, i - window + 1): i + 1]
        means.append(mean(w))
        stds.append(stdev(w))
    return means, stds


def momentum_signal(prices, lookback=10):
    sig = [0] * len(prices)
    for i in range(lookback, len(prices)):
        if prices[i] > prices[i - lookback]:
            sig[i] = 1
        elif prices[i] < prices[i - lookback]:
            sig[i] = -1
    return sig


def mean_reversion_signal(prices, window=20, entry_z=1.5, exit_z=0.25):
    means, stds = rolling_stats(prices, window)
    sig = [0] * len(prices)
    position = 0
    for i in range(len(prices)):
        if stds[i] <= 0:
            sig[i] = position
            continue
        z = (prices[i] - means[i]) / stds[i]
        if z <= -entry_z:
            position = 1
        elif z >= entry_z:
            position = -1
        elif abs(z) <= exit_z:
            position = 0
        sig[i] = position
    return sig


def max_drawdown(equity):
    if not equity:
        return 0.0
    peak = equity[0]
    worst = 0.0
    for x in equity:
        peak = max(peak, x)
        if peak:
            worst = min(worst, x / peak - 1.0)
    return worst


def performance_metrics(strategy_returns, equity, turnovers, annualization=252):
    r = strategy_returns[1:] if len(strategy_returns) > 1 else []
    if not r:
        return {}
    mu = mean(r)
    vol = stdev(r)
    sharpe = (mu / vol * math.sqrt(annualization)) if vol > 0 else 0.0
    downside = [x for x in r if x < 0]
    downside_vol = stdev(downside) if len(downside) > 1 else 0.0
    sortino = (mu / downside_vol * math.sqrt(annualization)) if downside_vol > 0 else 0.0
    sorted_r = sorted(r)
    idx = max(0, min(len(sorted_r) - 1, math.floor(0.05 * len(sorted_r))))
    var95 = sorted_r[idx]
    tail = [x for x in r if x <= var95]
    es95 = mean(tail) if tail else var95
    total_return = equity[-1] - 1.0 if equity else 0.0
    return {
        "total_return": total_return,
        "annualized_return": (1.0 + total_return) ** (annualization / max(1, len(r))) - 1.0,
        "volatility": vol * math.sqrt(annualization),
        "sharpe": sharpe,
        "sortino": sortino,
        "max_drawdown": max_drawdown(equity),
        "var_95": var95,
        "expected_shortfall_95": es95,
        "average_daily_return": mu,
        "turnover": sum(turnovers),
        "observations": len(r),
    }


def run_backtest(payload):
    observations = payload.get("data", [])
    strategy = payload.get("strategy", "mean_reversion")
    initial_capital = float(payload.get("initial_capital", 100000.0))
    fee_bps = float(payload.get("fee_bps", 5.0))
    slippage_bps = float(payload.get("slippage_bps", 2.0))
    leverage = float(payload.get("leverage", 1.0))

    observations = sorted(observations, key=lambda x: x.get("timestamp", ""))
    prices = [float(x["price"]) for x in observations if float(x.get("price", 0)) > 0]
    timestamps = [x.get("timestamp", i) for i, x in enumerate(observations) if float(x.get("price", 0)) > 0]
    if len(prices) < 5:
        raise ValueError("At least 5 valid price observations are required")

    params = payload.get("params", {})
    if strategy == "momentum":
        signals = momentum_signal(prices, int(params.get("lookback", 10)))
    elif strategy == "mean_reversion":
        signals = mean_reversion_signal(
            prices,
            int(params.get("window", 20)),
            float(params.get("entry_z", 1.5)),
            float(params.get("exit_z", 0.25)),
        )
    else:
        raise ValueError("Unknown strategy. Use momentum or mean_reversion.")

    # Position held during interval i -> i+1 uses signal[i], preventing same-bar lookahead.
    equity = [1.0]
    strategy_returns = [0.0]
    turnovers = [0.0]
    trades = []
    current_position = 0
    total_cost = 0.0

    for i in range(len(prices) - 1):
        target = max(-1, min(1, signals[i])) * leverage
        turnover = abs(target - current_position)
        gross = target * (prices[i + 1] / prices[i] - 1.0)
        trading_cost = turnover * (fee_bps + slippage_bps) / 10000.0
        net = gross - trading_cost
        equity.append(equity[-1] * (1.0 + net))
        strategy_returns.append(net)
        turnovers.append(turnover)
        total_cost += trading_cost

        if target != current_position:
            trades.append({
                "timestamp": timestamps[i],
                "price": prices[i],
                "from_position": current_position,
                "to_position": target,
                "turnover": turnover,
                "estimated_cost": trading_cost,
            })
            current_position = target

    metrics = performance_metrics(strategy_returns, equity, turnovers)
    metrics["estimated_transaction_cost"] = total_cost
    metrics["final_capital"] = initial_capital * equity[-1]
    metrics["pnl"] = initial_capital * (equity[-1] - 1.0)
    metrics["trade_count"] = len(trades)

    curve = [
        {
            "timestamp": timestamps[i],
            "price": prices[i],
            "equity": initial_capital * equity[i],
            "return": strategy_returns[i],
        }
        for i in range(len(prices))
    ]

    return {
        "strategy": strategy,
        "parameters": params,
        "metrics": metrics,
        "equity_curve": curve,
        "trades": trades,
    }


def main():
    try:
        payload = json.load(sys.stdin)
        print(json.dumps(run_backtest(payload)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
