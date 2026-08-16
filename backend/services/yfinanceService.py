#!/usr/bin/env python3
import yfinance as yf
import sys
import json

def get_stock_price(symbol):
    """
    Fetch current stock price from Yahoo Finance (Indian stocks)
    Symbol format: INFY.NS (NSE) or INFY.BO (BSE)
    """
    try:
        ticker = yf.Ticker(symbol)
        # Get current price
        data = ticker.history(period='1d')
        
        if data.empty:
            print(json.dumps({"error": f"No data for {symbol}"}), file=sys.stderr)
            return None
        
        current_price = data['Close'].iloc[-1]
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
