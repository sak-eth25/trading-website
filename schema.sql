-- =========================================================
-- Quant Trading Platform Database
-- =========================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STOCKS
CREATE TABLE IF NOT EXISTS stocks (
    stock_id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    current_price DECIMAL(15,4) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HISTORICAL PRICE DATA
CREATE TABLE IF NOT EXISTS pricedata (
    price_id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id)
        ON DELETE CASCADE,
    price DECIMAL(15,4) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricedata_stock_time
ON pricedata(stock_id, recorded_at);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id)
        ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id)
        ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL,
    order_type VARCHAR(20) NOT NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    price DECIMAL(15,4),
    limit_price DECIMAL(15,4),
    executed_price DECIMAL(15,4),
    stop_loss_price DECIMAL(15,4),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_status
ON orders(user_id, status)
WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_orders_stock_limit
ON orders(stock_id, limit_price, status)
WHERE status = 'PENDING';

-- TRADES
CREATE TABLE IF NOT EXISTS trades (
    trade_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id)
        ON DELETE CASCADE,
    executed_price DECIMAL(15,4) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PORTFOLIO
CREATE TABLE IF NOT EXISTS portfolio (
    portfolio_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id)
        ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id)
        ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    avg_price DECIMAL(15,4) NOT NULL DEFAULT 0,

    UNIQUE(user_id, stock_id)
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id)
        ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id)
        ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    amount DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SAMPLE STOCKS
-- =========================================================

INSERT INTO stocks (symbol, company_name, current_price)
VALUES
    ('RELIANCE.NS', 'Reliance Industries', 1400.00),
    ('TCS.NS', 'Tata Consultancy Services', 3000.00),
    ('INFY.NS', 'Infosys', 1500.00),
    ('HDFCBANK.NS', 'HDFC Bank', 1700.00),
    ('ICICIBANK.NS', 'ICICI Bank', 1300.00)
ON CONFLICT (symbol) DO NOTHING;
