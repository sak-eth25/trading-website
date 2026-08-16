import os
import sys

from sqlalchemy import create_engine
from urllib.parse import quote_plus
import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv

from strategies.mean_reversion import generate_signals
from analytics.performance import calculate_metrics


load_dotenv()


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "quanttrading"),
    "user": os.getenv("DB_USER", "quanttrader"),
    "password": os.getenv(
        "DB_PASSWORD",
        "quanttrader123"
    ),
}


def load_prices(symbol):

    password = quote_plus(
        os.getenv("DB_PASSWORD", "quanttrader123")
    )

    engine = create_engine(
        f"postgresql+psycopg2://"
        f"{os.getenv('DB_USER', 'quanttrader')}:"
        f"{password}@"
        f"{os.getenv('DB_HOST', 'localhost')}:"
        f"{os.getenv('DB_PORT', '5432')}/"
        f"{os.getenv('DB_NAME', 'quanttrading')}"
    )

    query = """
        SELECT
            p.recorded_at,
            p.open_price,
            p.high_price,
            p.low_price,
            p.close_price,
            p.volume
        FROM pricedata p
        JOIN stocks s
            ON s.stock_id = p.stock_id
        WHERE s.symbol = %s
          AND p.source = 'yahoo'
          AND p.interval = '5m'
        ORDER BY p.recorded_at
    """

    df = pd.read_sql(
        query,
        engine,
        params=(symbol,)
    )

    engine.dispose()

    if df.empty:
        raise ValueError(
            f"No historical data for {symbol}"
        )

    return df

def run_backtest(
    df,
    initial_capital=100000.0,
    transaction_cost=0.0005,
    slippage=0.0002
):

    df = generate_signals(df)

    # Critical:
    # trade using the NEXT bar's return.
    # This prevents look-ahead bias.
        # Price returns
    df["market_return"] = (
        df["close_price"]
        .pct_change()
        .fillna(0.0)
    )

    # Use the position decided on the previous bar.
    # This prevents look-ahead bias.
    df["position_lag"] = (
        df["position"]
        .shift(1)
        .fillna(0.0)
    )

    # Gross strategy return
    df["gross_return"] = (
        df["position_lag"]
        * df["market_return"]
    )

    # Position changes
    df["turnover"] = (
        df["position"]
        .diff()
        .abs()
        .fillna(0.0)
    )

    # Transaction costs + slippage
    trading_cost = (
        df["turnover"]
        * (transaction_cost + slippage)
    )

    df["strategy_return"] = (
        df["gross_return"]
        - trading_cost
    )

    # Make absolutely sure the first observation is valid
    df["strategy_return"] = (
        df["strategy_return"]
        .fillna(0.0)
    )

    # Equity curve
    df["equity"] = (
        initial_capital
        * (1.0 + df["strategy_return"])
        .cumprod()
    )

    return df


def main():

    symbol = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "RELIANCE.NS"
    )

    print("=" * 60)
    print(f"BACKTEST: {symbol}")
    print("=" * 60)

    df = load_prices(symbol)

    print(f"Bars: {len(df)}")

    result = run_backtest(df)

    metrics = calculate_metrics(result)

    print("\nPERFORMANCE")
    print("-" * 40)

    for key, value in metrics.items():

        if isinstance(value, float):

            if key in [
                "total_return",
                "annualized_return",
                "volatility",
                "max_drawdown",
                "win_rate",
            ]:
                print(
                    f"{key:20s}: "
                    f"{value:.2%}"
                )
            else:
                print(
                    f"{key:20s}: "
                    f"{value:.4f}"
                )

        else:
            print(
                f"{key:20s}: {value}"
            )

    print("\nTRADES")

    trades = (
        result["position"]
        .diff()
        .abs()
        .sum()
        / 2
    )

    print(
        f"Approx. round trips: {trades:.0f}"
    )

    # Save equity curve
    output = (
        f"quant/results_{symbol.replace('.', '_')}.csv"
    )

    result.to_csv(
        output,
        index=False
    )

    print(f"\nSaved results to {output}")


if __name__ == "__main__":
    main()
