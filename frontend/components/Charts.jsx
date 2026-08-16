import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './Charts.css';
import PriceChart from './PriceChart';

const API = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';

function Charts() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');

        const stocksRes = await fetch(API + '/stocks', { credentials: 'include' });
        const stocksData = await stocksRes.json().catch(() => []);

        if (!stocksRes.ok) {
          throw new Error(stocksData.message || 'Failed to load stocks data.');
        }

        setStocks(Array.isArray(stocksData) ? stocksData : []);
        console.log('📊 Stocks data received:', stocksData);
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

  if (loading) {
    return (
      <section className="main-content">
        <div className="charts-header">
          <div className="charts-eyebrow">Live Data</div>
          <h1 className="charts-title">Market Watch & Analysis</h1>
        </div>
        <p>Loading charts data...</p>
      </section>
    );
  }

  return (
    <section className="main-content">
      <div className="charts-header">
        <div className="charts-eyebrow">Live Data</div>
        <h1 className="charts-title">Market Watch & Analysis</h1>
        <p className="charts-subtitle">Real-time price charts and market insights</p>
      </div>

      {error && <p className="error-message">{error}</p>}

      {stocks.length === 0 ? (
        <div className="card">
          <p>No market data available.</p>
        </div>
      ) : (
        <div className="charts-grid">
          {stocks.map((stock) => (
            <div key={stock.stock_id} className="chart-item">
              <PriceChart stockId={stock.stock_id} symbol={stock.symbol} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Charts;
