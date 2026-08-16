import numpy as np
import pandas as pd


def calculate_metrics(df):

    equity = df["equity"]

    initial_capital = equity.iloc[0]

    if pd.isna(initial_capital):
        raise ValueError("Equity curve contains NaN at initialization")
    final_capital = equity.iloc[-1]

    total_return = (
        final_capital / initial_capital - 1
    )

    returns = (
        df["strategy_return"]
        .replace([np.inf, -np.inf], np.nan)
        .dropna()
    )

    periods_per_year = 252 * 75

    annualized_return = (
        (1 + total_return)
        ** (periods_per_year / max(len(returns), 1))
        - 1
    )

    volatility = (
        returns.std()
        * np.sqrt(periods_per_year)
    )

    if volatility > 0:

        sharpe = (
            returns.mean()
            / returns.std()
            * np.sqrt(periods_per_year)
        )

    else:
        sharpe = 0.0

    downside = returns[returns < 0]

    if len(downside) > 0:

        downside_std = downside.std()

        sortino = (
            returns.mean()
            / downside_std
            * np.sqrt(periods_per_year)
        )

    else:
        sortino = 0.0

    running_max = equity.cummax()

    drawdown = (
        equity / running_max - 1
    )

    max_drawdown = drawdown.min()

    winning = returns[returns > 0]
    losing = returns[returns < 0]

    win_rate = (
        len(winning) / len(returns)
        if len(returns) > 0
        else 0
    )

    gross_profit = winning.sum()
    gross_loss = abs(losing.sum())

    profit_factor = (
        gross_profit / gross_loss
        if gross_loss > 0
        else np.inf
    )

    return {
        "initial_capital": initial_capital,
        "final_capital": final_capital,
        "total_return": total_return,
        "annualized_return": annualized_return,
        "volatility": volatility,
        "sharpe": sharpe,
        "sortino": sortino,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
    }

