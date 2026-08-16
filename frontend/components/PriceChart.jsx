import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import io from 'socket.io-client';
import './PriceChart.css';

const API = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';

function PriceChart({ stockId, symbol }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('area');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    // Fetch historical price data
    const fetchPriceHistory = async () => {
      try {
        const response = await fetch(`${API}/price-history/${stockId}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (Array.isArray(data)) {
          // Format data for chart (last 50 data points)
          const formattedData = data.slice(-50).map((item) => ({
            time: new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(item.recorded_at).getTime(),
            price: parseFloat(item.price),
          }));
          setChartData(formattedData);
          
          // Calculate min/max/current
          if (formattedData.length > 0) {
            const prices = formattedData.map(d => d.price);
            setMinPrice(Math.min(...prices));
            setMaxPrice(Math.max(...prices));
            setCurrentPrice(prices[prices.length - 1]);
          }
        }
      } catch (err) {
        console.error('Error fetching price history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [stockId]);

  // Real-time price updates via WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('priceUpdate', (data) => {
      if (data.stock_id === stockId) {
        setChartData((prevData) => {
          const newData = [
            ...prevData,
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date().getTime(),
              price: data.price,
            },
          ];
          // Keep only last 50 data points
          const updated = newData.slice(-50);
          
          // Update price stats
          const prices = updated.map(d => d.price);
          setMinPrice(Math.min(...prices));
          setMaxPrice(Math.max(...prices));
          setCurrentPrice(prices[prices.length - 1]);
          
          return updated;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [stockId]);

  if (loading) {
    return (
      <div className="price-chart-container">
        <div className="chart-loading">
          <div className="spinner"></div>
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  const priceChange = chartData.length > 1 
    ? currentPrice - parseFloat(chartData[0].price)
    : 0;
  const percentChange = chartData.length > 1 
    ? ((priceChange / parseFloat(chartData[0].price)) * 100).toFixed(2)
    : 0;

  return (
    <div className="price-chart-container">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3 className="chart-title">📈 {symbol} - Live Price</h3>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Current</span>
              <span className="stat-value current-price">₹{currentPrice.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Change</span>
              <span className={`stat-value ${priceChange >= 0 ? 'gain' : 'loss'}`}>
                {priceChange >= 0 ? '+' : ''}₹{priceChange.toFixed(2)} ({percentChange}%)
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">High</span>
              <span className="stat-value">₹{maxPrice.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Low</span>
              <span className="stat-value">₹{minPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="chart-controls">
          <button 
            className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
          >
            Area
          </button>
          <button 
            className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
          >
            Line
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="time" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="rgba(255, 255, 255, 0.1)"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="rgba(255, 255, 255, 0.1)"
                  type="number"
                  domain={[Math.floor(minPrice - 5), Math.ceil(maxPrice + 5)]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                  formatter={(value) => [
                    `₹${parseFloat(value).toFixed(2)}`,
                    'Price'
                  ]}
                  labelStyle={{ color: '#86efac', fontWeight: 'bold' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Area 
                  type="monotone"
                  dataKey="price"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  dot={false}
                  name="Price (₹)"
                  isAnimationActive={true}
                  animationDuration={300}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="rgba(255, 255, 255, 0.1)"
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="rgba(255, 255, 255, 0.1)"
                  type="number"
                  domain={[Math.floor(minPrice - 5), Math.ceil(maxPrice + 5)]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                  formatter={(value) => [
                    `₹${parseFloat(value).toFixed(2)}`,
                    'Price'
                  ]}
                  labelStyle={{ color: '#86efac', fontWeight: 'bold' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone"
                  dataKey="price"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={false}
                  name="Price (₹)"
                  isAnimationActive={true}
                  animationDuration={300}
                  connectNulls={true}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="no-data">
            <p>No price data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceChart;
