#!/usr/bin/env python3
import yfinance as yf
import sys
import json


def get_stock_price(symbol):
    """
    Fetch latest available intraday price from Yahoo Finance.
    Symbol format: INFY.NS (NSE) or INFY.BO (BSE)
    """
    try:
        ticker = yf.Ticker(symbol)

        # Fetch recent 1-minute data instead of the daily candle close
        data = ticker.history(period="1d", interval="1m")

        if data.empty:
            print(
                json.dumps({"error": f"No data for {symbol}"}),
                file=sys.stderr
            )
            return None

        # Use the latest available intraday close
        current_price = data["Close"].dropna().iloc[-1]

        return float(current_price)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Symbol required"}), file=sys.stderr)
        sys.exit(1)

    symbol = sys.argv[1]
    price = get_stock_price(symbol)

    if price is not None:
        print(price)
    else:
        sys.exit(1)