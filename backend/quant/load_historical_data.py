import os

import pandas as pd
import yfinance as yf
import psycopg2
from dotenv import load_dotenv

load_dotenv()


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "quanttrading"),
    "user": os.getenv("DB_USER", "quanttrader"),
    "password": os.getenv("DB_PASSWORD", "quanttrader123"),
}


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


def get_stock_id(cursor, symbol):
    cursor.execute(
        """
        SELECT stock_id
        FROM stocks
        WHERE symbol = %s
        """,
        (symbol,)
    )

    row = cursor.fetchone()

    if row is None:
        raise ValueError(f"{symbol} does not exist in stocks table")

    return row[0]


def download_data(symbol, period="5d", interval="5m"):

    print(f"\nDownloading {symbol}...")

    df = yf.download(
        symbol,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False
    )

    if df.empty:
        raise ValueError(f"No data returned for {symbol}")

    # yfinance can return MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df.reset_index()

    timestamp_column = (
        "Datetime"
        if "Datetime" in df.columns
        else "Date"
    )

    required = [
        timestamp_column,
        "Open",
        "High",
        "Low",
        "Close",
        "Volume",
    ]

    df = df[required].copy()

    df.columns = [
        "recorded_at",
        "open_price",
        "high_price",
        "low_price",
        "close_price",
        "volume",
    ]

    df.dropna(
        subset=[
            "open_price",
            "high_price",
            "low_price",
            "close_price",
        ],
        inplace=True
    )

    return df


def insert_data(symbol, df):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        stock_id = get_stock_id(cursor, symbol)

        inserted = 0

        for _, row in df.iterrows():

            timestamp = row["recorded_at"]

            if hasattr(timestamp, "to_pydatetime"):
                timestamp = timestamp.to_pydatetime()

            open_price = float(row["open_price"])
            high_price = float(row["high_price"])
            low_price = float(row["low_price"])
            close_price = float(row["close_price"])
            volume = int(row["volume"])

            cursor.execute(
                """
                INSERT INTO pricedata
                (
                    stock_id,
                    price,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    volume,
                    recorded_at
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    stock_id,
                    close_price,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    volume,
                    timestamp,
                )
            )

            inserted += 1

        connection.commit()

        print(
            f"✓ {symbol}: inserted {inserted} OHLCV observations"
        )

    except Exception:

        connection.rollback()
        raise

    finally:

        cursor.close()
        connection.close()


def main():

    symbols = [
        "RELIANCE.NS",
        "TCS.NS",
        "INFY.NS",
        "HDFCBANK.NS",
        "ICICIBANK.NS",
    ]

    for symbol in symbols:

        try:

            df = download_data(
                symbol,
                period="5d",
                interval="5m"
            )

            insert_data(symbol, df)

        except Exception as error:

            print(
                f"✗ {symbol}: {error}"
            )


if __name__ == "__main__":
    main()
