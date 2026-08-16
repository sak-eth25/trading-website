import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './Portfolio.css';

const API = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';

function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setError('');
        const response = await fetch(API + '/portfolio', { credentials: 'include' });
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load portfolio');
        }

        const data = await response.json();
        setPortfolio(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Unable to load portfolio');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  // WebSocket connection for real-time price updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connected', (data) => {
      console.log('✅ Connected to trading backend:', data.message);
    });

    socket.on('priceUpdate', (data) => {
      console.log('📊 Price update received:', data);
      
      // Update portfolio with new prices
      setPortfolio(prevPortfolio =>
        prevPortfolio.map(item =>
          item.stock_id === data.stock_id
            ? {
                ...item,
                current_price: data.price,
                value: item.quantity * data.price
              }
            : item
        )
      );
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from trading backend');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Calculate total portfolio value and invested amount
  const totalValue = portfolio.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0
  );

  const totalInvested = portfolio.reduce(
    (sum, item) => sum + (item.quantity * Number(item.avg_price || 0)),
    0
  );

  const totalGainLoss = totalValue - totalInvested;
  const gainLossPercentage = totalInvested > 0 
    ? ((totalGainLoss / totalInvested) * 100).toFixed(2)
    : 0;

  if (loading) {
    return (
      <section className="main-content">
        <div className="portfolio-header-section">
          <h1 className="portfolio-title">Portfolio</h1>
        </div>
        <p>Loading portfolio data...</p>
      </section>
    );
  }

  return (
    <section className="main-content">
      <div className="portfolio-header-section">
        <div className="portfolio-eyebrow">Your Investments</div>
        <h1 className="portfolio-title">Holdings & Performance</h1>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Summary Cards */}
      <div className="portfolio-summary">
        <div className="summary-card">
          <h4>Total Value</h4>
          <p className="portfolio-total-value">₹{totalValue.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h4>Total Invested</h4>
          <p>₹{totalInvested.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h4>Gain / Loss</h4>
          <p className={totalGainLoss >= 0 ? 'portfolio-gain' : 'portfolio-loss'}>
            ₹{totalGainLoss.toFixed(2)} ({gainLossPercentage}%)
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <section className="section">
        <h2>Holdings</h2>
        <div className="card">
          {portfolio.length === 0 ? (
            <p>No holdings yet. Start trading to build your portfolio!</p>
          ) : (
            <table className="table portfolio-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Total Value</th>
                  <th>Gain / Loss</th>
                  <th>% Change</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => {
                  const itemTotalInvested = item.quantity * Number(item.avg_price || 0);
                  const itemCurrentValue = item.quantity * Number(item.current_price || 0);
                  const itemGainLoss = itemCurrentValue - itemTotalInvested;
                  const itemGainLossPercent = itemTotalInvested > 0
                    ? ((itemGainLoss / itemTotalInvested) * 100).toFixed(2)
                    : 0;
                  const isGain = itemGainLoss >= 0;

                  return (
                    <tr key={item.stock_id} className="holding-row">
                      <td className="holding-symbol">{item.symbol}</td>
                      <td className="holding-qty">{item.quantity}</td>
                      <td className="holding-price">
                        ₹{Number(item.avg_price || 0).toFixed(2)}
                      </td>
                      <td className="holding-current-price">
                        <strong>₹{Number(item.current_price || 0).toFixed(2)}</strong>
                      </td>
                      <td className="holding-value">
                        ₹{itemCurrentValue.toFixed(2)}
                      </td>
                      <td className={`holding-change ${isGain ? 'gain' : 'loss'}`}>
                        {isGain ? '+' : ''} ₹{itemGainLoss.toFixed(2)}
                      </td>
                      <td className={`holding-percent ${isGain ? 'gain' : 'loss'}`}>
                        {isGain ? '+' : ''} {itemGainLossPercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </section>
  );
}

export default Portfolio;
