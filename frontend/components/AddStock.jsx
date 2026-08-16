import React, { useState } from 'react';
import './AddStock.css';

const API = 'http://localhost:4000';

function AddStock() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetchedData, setFetchedData] = useState(null);
  const [adding, setAdding] = useState(false);

  const handleSearchStock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFetchedData(null);

    try {
      const res = await fetch(API + '/stocks/fetch-yfinance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch stock data');
      }

      setFetchedData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!fetchedData) return;

    setAdding(true);
    setError('');

    try {
      const res = await fetch(API + '/stocks/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          symbol: fetchedData.symbol,
          company_name: fetchedData.company_name,
          current_price: fetchedData.current_price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add stock');
      }

      setSuccess(`✅ ${fetchedData.symbol} added successfully!`);
      setFetchedData(null);
      setSymbol('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="main-content">
      <div className="add-stock-header">
        <div className="add-stock-eyebrow">Market Expansion</div>
        <h1 className="add-stock-title">Add New Stocks</h1>
        <p className="add-stock-subtitle">Search yfinance and expand your trading universe</p>
      </div>

      <div className="add-stock-container">
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="search-section">
          <form onSubmit={handleSearchStock}>
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Enter stock symbol (e.g., INFY.NS, TCS.NS, RELIANCE.NS)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn" disabled={loading}>
                {loading ? '🔄 Searching...' : '🔍 Search'}
              </button>
            </div>
          </form>
        </div>

        {fetchedData && (
          <div className="stock-details-card">
            <div className="details-header">
              <h2 className="details-title">Stock Details</h2>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Symbol</span>
                <span className="detail-value symbol-value">{fetchedData.symbol}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Company Name</span>
                <span className="detail-value">{fetchedData.company_name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Current Price</span>
                <span className="detail-value price-value">₹{fetchedData.current_price.toFixed(2)}</span>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="btn btn-add"
                onClick={handleAddStock}
                disabled={adding}
              >
                {adding ? '⏳ Adding...' : '✅ Add Stock'}
              </button>
              <button 
                className="btn btn-cancel"
                onClick={() => {
                  setFetchedData(null);
                  setSymbol('');
                }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

        {!fetchedData && !error && (
          <div className="info-card">
            <h3>How to add a stock:</h3>
            <ul>
              <li>Enter a valid NSE stock symbol (e.g., INFY.NS, TCS.NS, RELIANCE.NS)</li>
              <li>Click "Search" to fetch real-time data from yfinance</li>
              <li>Review the stock details</li>
              <li>Click "Add Stock" to add it to your platform</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default AddStock;
