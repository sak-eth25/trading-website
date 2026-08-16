import React, { useEffect, useState } from 'react';
import './Transactions.css';

const API = 'http://localhost:4000';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, BUY, SELL

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setError('');
        const response = await fetch(API + '/transactions', { credentials: 'include' });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load transactions');
        }

        const data = await response.json();
        setTransactions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Unable to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter transactions
  const filteredTransactions = filterType === 'ALL' 
    ? transactions 
    : transactions.filter(tx => tx.type === filterType);

  // Calculate totals
  const totalBuy = transactions
    .filter(tx => tx.type === 'BUY')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const totalSell = transactions
    .filter(tx => tx.type === 'SELL')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const netCashFlow = totalSell - totalBuy;

  if (loading) {
    return (
      <section className="main-content">
        <h1 className="transactions-title">Transaction History</h1>
        <p>Loading...</p>
      </section>
    );
  }

  return (
    <section className="main-content">
      <div className="transactions-header">
        <div className="transactions-eyebrow">Transaction History</div>
        <h1 className="transactions-title">Trade Activity & Reports</h1>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Summary Cards */}
      <div className="transaction-summary">
        <div className="summary-card">
          <h4>Total Spent</h4>
          <p className="tx-total-buy">₹{totalBuy.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h4>Total Proceeds</h4>
          <p className="tx-total-sell">₹{totalSell.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h4>Net Cash Flow</h4>
          <p className={netCashFlow >= 0 ? 'tx-net-positive' : 'tx-net-negative'}>
            {netCashFlow >= 0 ? '+' : ''} ₹{netCashFlow.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterType('ALL')}
        >
          All ({transactions.length})
        </button>
        <button
          className={`filter-btn ${filterType === 'BUY' ? 'active' : ''}`}
          onClick={() => setFilterType('BUY')}
        >
          Buy ({transactions.filter(tx => tx.type === 'BUY').length})
        </button>
        <button
          className={`filter-btn ${filterType === 'SELL' ? 'active' : ''}`}
          onClick={() => setFilterType('SELL')}
        >
          Sell ({transactions.filter(tx => tx.type === 'SELL').length})
        </button>
      </div>

      {/* Transactions Table */}
      <section className="section">
        <div className="card">
          {filteredTransactions.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            <div className="transactions-wrapper">
              <table className="table transactions-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, index) => (
                    <tr key={tx.transaction_id} className="transaction-row">
                      <td className="tx-index">{index + 1}</td>
                      <td className="tx-symbol">{tx.symbol || '-'}</td>
                      <td>
                        <span className={`tx-type-badge ${tx.type === 'BUY' ? 'tx-buy' : 'tx-sell'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="tx-qty">{tx.quantity}</td>
                      <td className="tx-price">₹{Number(tx.price || 0).toFixed(2)}</td>
                      <td className={`tx-amount ${tx.amount < 0 ? 'tx-negative' : 'tx-positive'}`}>
                        {tx.amount < 0 ? '-' : '+'} ₹{Math.abs(Number(tx.amount || 0)).toFixed(2)}
                      </td>
                      <td className="tx-date">
                        {new Date(tx.created_at).toLocaleDateString()} <br />
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      {transactions.length > 0 && (
        <section className="section">
          <h2>Quick Stats</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Transactions</h4>
              <p className="stat-value">{transactions.length}</p>
            </div>

            <div className="stat-card">
              <h4>Buy Orders</h4>
              <p className="stat-value tx-buy">{transactions.filter(tx => tx.type === 'BUY').length}</p>
            </div>

            <div className="stat-card">
              <h4>Sell Orders</h4>
              <p className="stat-value tx-sell">{transactions.filter(tx => tx.type === 'SELL').length}</p>
            </div>

            <div className="stat-card">
              <h4>Average Trade Value</h4>
              <p className="stat-value">
                ₹{(transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0) / transactions.length).toFixed(2)}
              </p>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

export default Transactions;
