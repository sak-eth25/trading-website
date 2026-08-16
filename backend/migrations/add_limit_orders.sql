-- Migration: Add Limit Order Support
-- This migration adds support for limit orders (buy/sell at specific prices)

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN limit_price DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN executed_price DECIMAL(10, 2);

-- Update existing completed orders with current_price as executed_price
UPDATE orders SET executed_price = price WHERE status = 'COMPLETED' AND executed_price IS NULL;

-- Add index on status for faster pending order queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status) WHERE status = 'PENDING';

-- Add index on stock_id and price for order matching
CREATE INDEX idx_orders_stock_limit ON orders(stock_id, limit_price, status) WHERE status = 'PENDING';
