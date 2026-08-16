import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './QuantLab.css';

const API = 'http://localhost:4000';

function Metric({ label, value, pct = false }) {
  const n = Number(value);
  const display = Number.isFinite(n)
    ? `${pct ? (n * 100).toFixed(2) + '%' : n.toFixed(4)}`
    : '-';
  return <div className="quant-metric"><span>{label}</span><strong>{display}</strong></div>;
}

export default function QuantLab() {
  const [stocks, setStocks] = useState([]);
  const [stockId, setStockId] = useState('');
  const [strategy, setStrategy] = useState('mean_reversion');
  const [window, setWindow] = useState(20);
  const [entryZ, setEntryZ] = useState(1.5);
  const [exitZ, setExitZ] = useState(0.25);
  const [lookback, setLookback] = useState(10);
  const [capital, setCapital] = useState(100000);
  const [feeBps, setFeeBps] = useState(5);
  const [slippageBps, setSlippageBps] = useState(2);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/stocks`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setStocks(Array.isArray(data) ? data : []);
        if (data?.length) setStockId(String(data[0].stock_id));
      })
      .catch(() => setError('Unable to load stocks'));
  }, []);

  const selectedStock = useMemo(
    () => stocks.find(s => String(s.stock_id) === String(stockId)),
    [stocks, stockId]
  );

  const runBacktest = async () => {
    if (!stockId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = strategy === 'mean_reversion'
        ? { window: Number(window), entry_z: Number(entryZ), exit_z: Number(exitZ) }
        : { lookback: Number(lookback) };

      const response = await fetch(`${API}/quant/backtest/${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          strategy,
          params,
          initial_capital: Number(capital),
          fee_bps: Number(feeBps),
          slippage_bps: Number(slippageBps),
          limit: 5000
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Backtest failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="main-content quant-page">
      <div className="quant-header">
        <div>
          <div className="quant-eyebrow">SYSTEMATIC RESEARCH</div>
          <h1>Quant Research Lab</h1>
          <p>Backtest systematic strategies with execution costs and risk analytics.</p>
        </div>
      </div>

      <div className="quant-grid">
        <section className="card quant-controls">
          <h2>Experiment</h2>

          <label>Instrument</label>
          <select value={stockId} onChange={e => setStockId(e.target.value)}>
            {stocks.map(s => <option key={s.stock_id} value={s.stock_id}>{s.symbol}</option>)}
          </select>

          <label>Strategy</label>
          <select value={strategy} onChange={e => setStrategy(e.target.value)}>
            <option value="mean_reversion">Z-Score Mean Reversion</option>
            <option value="momentum">Time-Series Momentum</option>
          </select>

          {strategy === 'mean_reversion' ? (
            <>
              <label>Rolling Window</label>
              <input type="number" min="2" value={window} onChange={e => setWindow(e.target.value)} />
              <label>Entry Z-Score</label>
              <input type="number" step="0.1" value={entryZ} onChange={e => setEntryZ(e.target.value)} />
              <label>Exit Z-Score</label>
              <input type="number" step="0.05" value={exitZ} onChange={e => setExitZ(e.target.value)} />
            </>
          ) : (
            <>
              <label>Momentum Lookback</label>
              <input type="number" min="1" value={lookback} onChange={e => setLookback(e.target.value)} />
            </>
          )}

          <label>Initial Capital</label>
          <input type="number" min="1" value={capital} onChange={e => setCapital(e.target.value)} />
          <label>Transaction Cost (bps)</label>
          <input type="number" min="0" step="0.5" value={feeBps} onChange={e => setFeeBps(e.target.value)} />
          <label>Slippage (bps)</label>
          <input type="number" min="0" step="0.5" value={slippageBps} onChange={e => setSlippageBps(e.target.value)} />

          <button className="quant-run" onClick={runBacktest} disabled={loading || !stockId}>
            {loading ? 'Running...' : `Run ${selectedStock?.symbol || ''} Backtest`}
          </button>

          {error && <div className="quant-error">{error}</div>}
        </section>

        <section className="card quant-results">
          <h2>Performance</h2>
          {!result ? (
            <div className="quant-empty">Configure an experiment and run the backtest.</div>
          ) : (
            <>
              <div className="metric-grid">
                <Metric label="Total Return" value={result.metrics.total_return} pct />
                <Metric label="Annualized Return" value={result.metrics.annualized_return} pct />
                <Metric label="Volatility" value={result.metrics.volatility} pct />
                <Metric label="Sharpe" value={result.metrics.sharpe} />
                <Metric label="Sortino" value={result.metrics.sortino} />
                <Metric label="Max Drawdown" value={result.metrics.max_drawdown} pct />
                <Metric label="VaR 95%" value={result.metrics.var_95} pct />
                <Metric label="Expected Shortfall" value={result.metrics.expected_shortfall_95} pct />
                <Metric label="Final Capital" value={result.metrics.final_capital} />
                <Metric label="Trades" value={result.metrics.trade_count} />
              </div>

              <div className="chart-wrapper">
                <h3>Equity Curve</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={result.equity_curve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tickFormatter={v => new Date(v).toLocaleDateString()} />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()} />
                    <Line type="monotone" dataKey="equity" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="quant-notes">
                <strong>Research notes</strong>
                <span>Signals are shifted one observation before returns are applied.</span>
                <span>Transaction costs and slippage are included.</span>
                <span>Use out-of-sample / walk-forward testing before treating results as meaningful.</span>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
