import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './Orders.css';

const API = 'http://localhost:4000';
const SOCKET_URL = 'http://localhost:4000';

function Orders() {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('trade');

  // Buy form state
  const [buyStock, setBuyStock] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyLimitPrice, setBuyLimitPrice] = useState('');
  const [buyOrderType, setBuyOrderType] = useState('market');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyMessage, setBuyMessage] = useState('');

  // Sell form state
  const [sellStock, setSellStock] = useState('');
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellLimitPrice, setSellLimitPrice] = useState('');
  const [sellOrderType, setSellOrderType] = useState('market');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMessage, setSellMessage] = useState('');

  // Stop-loss form state
  const [stopLossStock, setStopLossStock] = useState('');
  const [stopLossQuantity, setStopLossQuantity] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [stopLossLoading, setStopLossLoading] = useState(false);
  const [stopLossMessage, setStopLossMessage] = useState('');

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [stocksRes, portfolioRes, ordersRes, pendingRes, transactionsRes] = await Promise.all([
          fetch(API + '/stocks', { credentials: 'include' }),
          fetch(API + '/portfolio', { credentials: 'include' }),
          fetch(API + '/orders', { credentials: 'include' }),
          fetch(API + '/pending-orders', { credentials: 'include' }),
          fetch(API + '/transactions', { credentials: 'include' }),
        ]);

        const [stocksData, portfolioData, ordersData, pendingData, transactionsData] = await Promise.all([
          stocksRes.json().catch(() => []),
          portfolioRes.json().catch(() => []),
          ordersRes.json().catch(() => []),
          pendingRes.json().catch(() => []),
          transactionsRes.json().catch(() => []),
        ]);

        if (!stocksRes.ok || !portfolioRes.ok || !ordersRes.ok) {
          throw new Error('Failed to load data');
        }

        setStocks(Array.isArray(stocksData) ? stocksData : []);
        setPortfolio(Array.isArray(portfolioData) ? portfolioData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setPendingOrders(Array.isArray(pendingData) ? pendingData : []);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      } catch (err) {
        setError(err.message || 'Unable to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // WebSocket connection for order execution notifications
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('orderExecuted', (data) => {
      console.log('✅ Order executed:', data);
      setPendingOrders(prev => prev.filter(o => o.order_id !== data.order_id));
      setBuyMessage(`✨ ${data.type} order executed at ₹${data.executed_price}`);
      setTimeout(() => {
        location.reload();
      }, 2000);
    });

    return () => socket.disconnect();
  }, []);

  // Handle Buy
  const handleBuy = async (e) => {
    e.preventDefault();

    if (!buyStock || !buyQuantity) {
      setBuyMessage('Please select a stock and enter quantity');
      return;
    }

    if (buyQuantity <= 0) {
      setBuyMessage('Quantity must be greater than 0');
      return;
    }

    if (buyOrderType === 'limit' && !buyLimitPrice) {
      setBuyMessage('Please enter a limit price');
      return;
    }

    if (buyOrderType === 'limit' && buyLimitPrice <= 0) {
      setBuyMessage('Limit price must be greater than 0');
      return;
    }

    setBuyLoading(true);
    setBuyMessage('');

    try {
      const payload = {
        stock_id: parseInt(buyStock),
        quantity: parseInt(buyQuantity),
      };

      if (buyOrderType === 'limit') {
        payload.limit_price = parseFloat(buyLimitPrice);
      }

      const response = await fetch(API + '/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to place order');
      }

      setBuyMessage(`✅ ${data.message}!`);
      setBuyStock('');
      setBuyQuantity('');
      setBuyLimitPrice('');

      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (err) {
      setBuyMessage('❌ ' + (err.message || 'Failed to place order'));
    } finally {
      setBuyLoading(false);
    }
  };

  // Handle Sell
  const handleSell = async (e) => {
    e.preventDefault();

    if (!sellStock || !sellQuantity) {
      setSellMessage('Please select a stock and enter quantity');
      return;
    }

    if (sellQuantity <= 0) {
      setSellMessage('Quantity must be greater than 0');
      return;
    }

    if (sellOrderType === 'limit' && !sellLimitPrice) {
      setSellMessage('Please enter a limit price');
      return;
    }

    if (sellOrderType === 'limit' && sellLimitPrice <= 0) {
      setSellMessage('Limit price must be greater than 0');
      return;
    }

    setSellLoading(true);
    setSellMessage('');

    try {
      const payload = {
        stock_id: parseInt(sellStock),
        quantity: parseInt(sellQuantity),
      };

      if (sellOrderType === 'limit') {
        payload.limit_price = parseFloat(sellLimitPrice);
      }

      const response = await fetch(API + '/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to place order');
      }

      setSellMessage(`✅ ${data.message}!`);
      setSellStock('');
      setSellQuantity('');
      setSellLimitPrice('');

      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (err) {
      setSellMessage('❌ ' + (err.message || 'Failed to place order'));
    } finally {
      setSellLoading(false);
    }
  };

  // Handle Stop-Loss
  const handleStopLoss = async (e) => {
    e.preventDefault();

    if (!stopLossStock || !stopLossQuantity || !stopLossPrice) {
      setStopLossMessage('Please select a stock, quantity, and stop-loss price');
      return;
    }

    if (stopLossQuantity <= 0) {
      setStopLossMessage('Quantity must be greater than 0');
      return;
    }

    if (stopLossPrice <= 0) {
      setStopLossMessage('Stop-loss price must be greater than 0');
      return;
    }

    // Get current price of selected stock
    const selectedStock = stocks.find(s => s.stock_id === parseInt(stopLossStock));
    if (!selectedStock) {
      setStopLossMessage('Stock not found');
      return;
    }

    if (stopLossPrice >= selectedStock.current_price) {
      setStopLossMessage(`Stop-loss price must be below current price (₹${selectedStock.current_price})`);
      return;
    }

    setStopLossLoading(true);
    setStopLossMessage('');

    try {
      const response = await fetch(API + '/stop-loss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stock_id: parseInt(stopLossStock),
          quantity: parseInt(stopLossQuantity),
          stop_loss_price: parseFloat(stopLossPrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to set stop-loss');
      }

      setStopLossMessage(`✅ ${data.message}!`);
      setStopLossStock('');
      setStopLossQuantity('');
      setStopLossPrice('');

      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (err) {
      setStopLossMessage('❌ ' + (err.message || 'Failed to set stop-loss'));
    } finally {
      setStopLossLoading(false);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const response = await fetch(API + '/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setPendingOrders(prev => prev.filter(o => o.order_id !== orderId));
      alert('Order cancelled successfully');
    } catch (err) {
      alert('❌ Error: ' + (err.message || 'Failed to cancel order'));
    }
  };

  // Get selected stock details for preview
  const selectedBuyStock = stocks.find(s => s.stock_id === parseInt(buyStock));
  const buyPrice = buyOrderType === 'limit' && buyLimitPrice ? parseFloat(buyLimitPrice) : selectedBuyStock?.current_price || 0;
  const buyPreviewTotal = selectedBuyStock && buyQuantity ? 
    (buyPrice * parseInt(buyQuantity)).toFixed(2) : 0;

  const selectedSellStock = stocks.find(s => s.stock_id === parseInt(sellStock));
  const sellPrice = sellOrderType === 'limit' && sellLimitPrice ? parseFloat(sellLimitPrice) : selectedSellStock?.current_price || 0;
  const sellPreviewTotal = selectedSellStock && sellQuantity ? 
    (sellPrice * parseInt(sellQuantity)).toFixed(2) : 0;

  if (loading) {
    return (
      <section className="main-content">
        <h1 className="orders-title">Orders & Trading</h1>
        <p>Loading...</p>
      </section>
    );
  }

  return (
    <section className="main-content">
      <div className="orders-header">
        <div className="orders-eyebrow">Place Orders</div>
        <h1 className="orders-title">Buy & Sell Securities</h1>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Tabs */}
      <div className="orders-tabs">
        <button 
          className={`tab-btn ${activeTab === 'trade' ? 'active' : ''}`}
          onClick={() => setActiveTab('trade')}
        >
          Buy / Sell
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stoploss' ? 'active' : ''}`}
          onClick={() => setActiveTab('stoploss')}
        >
          Stop-Loss Orders
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Orders ({pendingOrders.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Order History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>

      {/* TRADE TAB */}
      {activeTab === 'trade' && (
        <div className="trading-forms">
          {/* BUY FORM */}
          <section className="form-section buy-section">
            <h2>Buy Stock</h2>
            <form onSubmit={handleBuy} className="trading-form">
              <div className="form-group">
                <label>Order Type</label>
                <div className="order-type-buttons">
                  <button 
                    type="button"
                    className={`order-type-btn ${buyOrderType === 'market' ? 'active' : ''}`}
                    onClick={() => setBuyOrderType('market')}
                  >
                    Market Order
                  </button>
                  <button 
                    type="button"
                    className={`order-type-btn ${buyOrderType === 'limit' ? 'active' : ''}`}
                    onClick={() => setBuyOrderType('limit')}
                  >
                    Limit Order
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Select Stock</label>
                <select
                  value={buyStock}
                  onChange={(e) => setBuyStock(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- Choose a stock --</option>
                  {stocks.map(stock => (
                    <option key={stock.stock_id} value={stock.stock_id}>
                      {stock.symbol} - ₹{Number(stock.current_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(e.target.value)}
                  className="form-input"
                  placeholder="Enter quantity"
                />
              </div>

              {buyOrderType === 'limit' && (
                <div className="form-group">
                  <label>Limit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyLimitPrice}
                    onChange={(e) => setBuyLimitPrice(e.target.value)}
                    className="form-input"
                    placeholder="Max price you want to pay"
                  />
                </div>
              )}

              {selectedBuyStock && buyQuantity && (
                <div className="preview-box buy-preview">
                  <div className="preview-row">
                    <span>Current Price:</span>
                    <strong>₹{Number(selectedBuyStock.current_price).toFixed(2)}</strong>
                  </div>
                  {buyOrderType === 'limit' && buyLimitPrice && (
                    <div className="preview-row">
                      <span>Limit Price:</span>
                      <strong>₹{Number(buyLimitPrice).toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="preview-row">
                    <span>Quantity:</span>
                    <strong>{buyQuantity}</strong>
                  </div>
                  <div className="preview-row total">
                    <span>{buyOrderType === 'market' ? 'Est. Cost' : 'Total Cost at Limit'}:</span>
                    <strong>${buyPreviewTotal}</strong>
                  </div>
                  {buyOrderType === 'limit' && (
                    <div className="preview-note">
                      ⏳ This order will execute when price drops to ₹{Number(buyLimitPrice).toFixed(2)} or below
                    </div>
                  )}
                </div>
              )}

              {buyMessage && (
                <p className={`message ${buyMessage.includes('✅') ? 'success' : 'error'}`}>
                  {buyMessage}
                </p>
              )}

              <button 
                type="submit" 
                className="btn btn-buy"
                disabled={buyLoading}
              >
                {buyLoading ? 'Processing...' : `Place ${buyOrderType === 'market' ? 'Market' : 'Limit'} Buy Order`}
              </button>
            </form>
          </section>

          {/* SELL FORM */}
          <section className="form-section sell-section">
            <h2>Sell Stock</h2>
            <form onSubmit={handleSell} className="trading-form">
              <div className="form-group">
                <label>Order Type</label>
                <div className="order-type-buttons">
                  <button 
                    type="button"
                    className={`order-type-btn ${sellOrderType === 'market' ? 'active' : ''}`}
                    onClick={() => setSellOrderType('market')}
                  >
                    Market Order
                  </button>
                  <button 
                    type="button"
                    className={`order-type-btn ${sellOrderType === 'limit' ? 'active' : ''}`}
                    onClick={() => setSellOrderType('limit')}
                  >
                    Limit Order
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Select Stock from Portfolio</label>
                <select
                  value={sellStock}
                  onChange={(e) => setSellStock(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- Choose a stock --</option>
                  {portfolio.map(item => (
                    <option key={item.stock_id} value={item.stock_id}>
                      {item.symbol} (Qty: {item.quantity}) - {Number(item.current_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity to Sell</label>
                <input
                  type="number"
                  min="1"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  className="form-input"
                  placeholder="Enter quantity"
                />
              </div>

              {sellOrderType === 'limit' && (
                <div className="form-group">
                  <label>Limit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellLimitPrice}
                    onChange={(e) => setSellLimitPrice(e.target.value)}
                    className="form-input"
                    placeholder="Min price you want to receive"
                  />
                </div>
              )}

              {selectedSellStock && sellQuantity && (
                <div className="preview-box sell-preview">
                  <div className="preview-row">
                    <span>Current Price:</span>
                    <strong>₹{Number(selectedSellStock.current_price).toFixed(2)}</strong>
                  </div>
                  {sellOrderType === 'limit' && sellLimitPrice && (
                    <div className="preview-row">
                      <span>Limit Price:</span>
                      <strong>₹{Number(sellLimitPrice).toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="preview-row">
                    <span>Quantity:</span>
                    <strong>{sellQuantity}</strong>
                  </div>
                  <div className="preview-row total">
                    <span>{sellOrderType === 'market' ? 'Est. Proceeds' : 'Total Proceeds at Limit'}:</span>
                    <strong>${sellPreviewTotal}</strong>
                  </div>
                  {sellOrderType === 'limit' && (
                    <div className="preview-note">
                      ⏳ This order will execute when price rises to ₹{Number(sellLimitPrice).toFixed(2)} or above
                    </div>
                  )}
                </div>
              )}

              {sellMessage && (
                <p className={`message ${sellMessage.includes('✅') ? 'success' : 'error'}`}>
                  {sellMessage}
                </p>
              )}

              <button 
                type="submit" 
                className="btn btn-sell"
                disabled={sellLoading || portfolio.length === 0}
              >
                {sellLoading ? 'Processing...' : `Place ${sellOrderType === 'market' ? 'Market' : 'Limit'} Sell Order`}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* STOP-LOSS TAB */}
      {activeTab === 'stoploss' && (
        <div className="trade-section">
          <section className="form-section">
            <h2>Set Stop-Loss Orders 🛑</h2>
            <p className="form-subtitle">
              Protect against losses by automatically selling when price drops below your target
            </p>
            
            <form onSubmit={handleStopLoss}>
              <div className="form-group">
                <label>Select Stock to Protect:</label>
                <select 
                  value={stopLossStock} 
                  onChange={(e) => setStopLossStock(e.target.value)}
                  className="form-input"
                >
                  <option value="">-- Choose a stock you own --</option>
                  {portfolio.map(p => (
                    <option key={p.stock_id} value={p.stock_id}>
                      {p.symbol} - {p.quantity} shares @ ₹{p.current_price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity:</label>
                  <input 
                    type="number" 
                    min="1"
                    value={stopLossQuantity} 
                    onChange={(e) => setStopLossQuantity(e.target.value)}
                    placeholder="e.g., 5"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Stop-Loss Price (₹):</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={stopLossPrice} 
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    placeholder="e.g., 1950"
                    className="form-input"
                  />
                </div>
              </div>

              {stopLossStock && stopLossQuantity && stopLossPrice && (
                <div className="price-preview">
                  {(() => {
                    const stock = stocks.find(s => s.stock_id === parseInt(stopLossStock));
                    return (
                      <>
                        <div className="preview-row">
                          <span>Current Price:</span>
                          <span className="price-value">₹{stock?.current_price}</span>
                        </div>
                        <div className="preview-row">
                          <span>Stop-Loss Price:</span>
                          <span className="price-value highlight">₹{stopLossPrice}</span>
                        </div>
                        <div className="preview-row">
                          <span>Total Shares:</span>
                          <span className="price-value">{stopLossQuantity}</span>
                        </div>
                        <div className="preview-row highlight-row">
                          <span>⚠️ Will sell {stopLossQuantity} shares if price drops to ₹{stopLossPrice}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {stopLossMessage && (
                <p className={stopLossMessage.includes('✅') ? 'success-message' : 'error-message'}>
                  {stopLossMessage}
                </p>
              )}

              <button 
                type="submit" 
                disabled={stopLossLoading || !stopLossStock || !stopLossQuantity || !stopLossPrice}
                className="submit-btn"
              >
                {stopLossLoading ? 'Setting...' : '🛑 Set Stop-Loss Order'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* PENDING ORDERS TAB */}
      {activeTab === 'pending' && (
        <section className="section">
          <h2>Pending Orders</h2>
          <div className="card">
            {pendingOrders.length === 0 ? (
              <p>No pending orders.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Limit Price</th>
                    <th>Current Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(order => (
                    <tr key={order.order_id}>
                      <td className="order-symbol">{order.symbol}</td>
                      <td>
                        <span className={`order-status ${order.type === 'BUY' ? 'order-buy' : 'order-sell'}`}>
                          {order.type}
                        </span>
                      </td>
                      <td>{order.quantity}</td>
                      <td>
                        {order.order_type === 'STOP-LOSS' ? (
                          `₹${Number(order.stop_loss_price || 0).toFixed(2)} (SL)`
                        ) : (
                          `₹${Number(order.limit_price || 0).toFixed(2)}`
                        )}
                      </td>
                      <td>₹{Number(order.current_price || 0).toFixed(2)}</td>
                      <td>
                        <span className="order-status pending-status">⏳ {order.status}</span>
                      </td>
                      <td>
                        <button 
                          className="btn-small btn-cancel"
                          onClick={() => handleCancelOrder(order.order_id)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* ORDER HISTORY TAB */}
      {activeTab === 'history' && (
        <section className="section">
          <h2>Order History</h2>
          <div className="card">
            {orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Order Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Executed Price</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.order_id}>
                      <td className="order-symbol">{order.symbol}</td>
                      <td>
                        <span className={`order-status ${order.type === 'BUY' ? 'order-buy' : 'order-sell'}`}>
                          {order.type}
                        </span>
                      </td>
                      <td>{order.order_type}</td>
                      <td>{order.quantity}</td>
                      <td>₹{Number(order.price || 0).toFixed(2)}</td>
                      <td>{order.executed_price ? `₹${Number(order.executed_price).toFixed(2)}` : '-'}</td>
                      <td>
                        <span className={`order-status ${order.status === 'EXECUTED' ? 'order-buy' : order.status === 'CANCELLED' ? 'order-cancelled' : ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="order-date">
                        {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <section className="section">
          <h2>Transaction History</h2>
          <div className="card">
            {transactions.length === 0 ? (
              <p>No transactions yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.transaction_id}>
                      <td className="tx-symbol">{tx.symbol || '-'}</td>
                      <td>
                        <span className={`order-status ${tx.type === 'BUY' ? 'order-buy' : 'order-sell'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.quantity}</td>
                      <td>${Number(tx.price || 0).toFixed(2)}</td>
                      <td className={tx.amount > 0 ? 'tx-positive' : 'tx-negative'}>
                        {tx.amount > 0 ? '+' : ''}${Number(tx.amount || 0).toFixed(2)}
                      </td>
                      <td className="tx-date">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

export default Orders;
