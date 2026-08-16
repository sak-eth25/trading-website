import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './Dashboard.css';

const API = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';

function Dashboard() {
  const [balance, setBalance] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');

        const [balanceRes, portfolioRes, ordersRes, stocksRes] = await Promise.all([
          fetch(API + '/balance', { credentials: 'include' }),
          fetch(API + '/portfolio', { credentials: 'include' }),
          fetch(API + '/orders', { credentials: 'include' }),
          fetch(API + '/stocks', { credentials: 'include' }),
        ]);

        const [balanceData, portfolioData, ordersData, stocksData] = await Promise.all([
          balanceRes.json().catch(() => ({})),
          portfolioRes.json().catch(() => []),
          ordersRes.json().catch(() => []),
          stocksRes.json().catch(() => []),
        ]);

        if (!balanceRes.ok || !portfolioRes.ok || !ordersRes.ok || !stocksRes.ok) {
          const message =
            balanceData.message ||
            portfolioData.message ||
            ordersData.message ||
            stocksData.message ||
            'Failed to load dashboard data.';
          throw new Error(message);
        }

        setBalance(Number(balanceData.balance || 0));
        setPortfolio(Array.isArray(portfolioData) ? portfolioData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setStocks(Array.isArray(stocksData) ? stocksData : []);
        
        // Debug logging
        console.log('📊 Stocks data received:', stocksData);
        if (stocksData.length > 0) {
          console.log('First stock:', stocksData[0]);
        }
      } catch (err) {
        setError(err.message || 'Unable to connect to backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // WebSocket connection for real-time price updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connected', (data) => {
      console.log('✅ Connected to trading backend:', data.message);
    });

    socket.on('priceUpdate', (data) => {
      console.log('📊 Price update received:', data);
      
      // Update stocks with new price
      setStocks(prevStocks =>
        prevStocks.map(stock =>
          stock.stock_id === data.stock_id
            ? { ...stock, current_price: data.price, last_updated: data.timestamp }
            : stock
        )
      );

      // Update portfolio if this stock is in the portfolio
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

    socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const totalPortfolioValue = portfolio.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0
  );

  if (loading) {
    return (
      <section className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Dashboard</h1>
        </div>
        <p>Loading dashboard data...</p>
      </section>
    );
  }

  return (
    <section className="main-content">
      <div className="dashboard-header">
        <div className="dashboard-eyebrow">Trading Dashboard</div>
        <h1 className="dashboard-title">Your Dashboard</h1>
      </div>

      {error && <p className="red">{error}</p>}

      <div className="balance-card">
        <p className="balance-label">Available Balance</p>
        <p className="balance-value">₹{balance !== null ? balance.toFixed(2) : '0.00'}</p>
      </div>

      <section className="section">
        <h2>Portfolio</h2>
        <div className="card">
          <p>
            Total Portfolio Value:{' '}
            <strong className={totalPortfolioValue >= 0 ? 'green' : 'red'}>
              ₹{totalPortfolioValue.toFixed(2)}
            </strong>
          </p>

          {portfolio.length === 0 ? (
            <p>No holdings yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th>Current Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.slice(0, 5).map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.symbol}</td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.current_price || 0).toFixed(2)}</td>
                    <td>₹{Number(item.value || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="section">
        <h2>Latest Orders</h2>
        <div className="card">
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.symbol}</td>
                    <td className={order.order_type === 'BUY' ? 'green' : 'red'}>
                      {order.order_type}
                    </td>
                    <td>{order.quantity}</td>
                    <td>₹{Number(order.price || 0).toFixed(2)}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="section">
        <h2>📊 Top Stocks</h2>
        <div className="card">
          {stocks.length === 0 ? (
            <p>No market data available.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Current Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.slice(0, 8).map((stock) => (
                    <tr key={stock.stock_id || stock.symbol} className="stock-row">
                      <td>{stock.symbol}</td>
                      <td>{stock.company_name || stock.name || '-'}</td>
                      <td className="stock-price">
                        <strong>₹{Number(stock.current_price || 0).toFixed(2)}</strong>
                      </td>
                      <td className="stock-status">
                        <span className="live-indicator">● Live</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
