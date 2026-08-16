import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import './app.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Orders from './components/Orders';
import Transactions from './components/Transactions';
import Charts from './components/Charts';
import AddStock from './components/AddStock';
import QuantLab from './components/QuantLab';

const API = "http://localhost:4000";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(API + "/isLoggedIn", {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.isLoggedIn) setUser(data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (user) => {
    setUser(user);
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await fetch(API + "/logout", {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors and continue local logout.
    }
    setUser(null);
    navigate('/login');
  };

  if (loading) return <div className="app-loading">Loading...</div>;

  return (
    <div className="app-shell">
      {user && (
        <nav className="app-nav">
          <div className="app-user">Hello, {user.username}</div>

          <div className="app-nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Portfolio
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Orders
            </NavLink>
            <NavLink
              to="/charts"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Market Watch
            </NavLink>
            <NavLink
              to="/add-stock"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Add Stock
            </NavLink>
            <NavLink
              to="/quant"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Quant Lab
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) =>
                isActive ? 'app-link app-link-active' : 'app-link'
              }
            >
              Transactions
            </NavLink>
            <button className="app-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}

      <main className="app-content">
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/" element={
            user ? <Dashboard /> : <Navigate to="/login" />
          } />
          <Route path="/portfolio" element={
            user ? <Portfolio /> : <Navigate to="/login" />
          } />
          <Route path="/orders" element={
            user ? <Orders /> : <Navigate to="/login" />
          } />
          <Route path="/charts" element={
            user ? <Charts /> : <Navigate to="/login" />
          } />
          <Route path="/add-stock" element={
            user ? <AddStock /> : <Navigate to="/login" />
          } />
          <Route path="/quant" element={
            user ? <QuantLab /> : <Navigate to="/login" />
          } />
          <Route path="/transactions" element={
            user ? <Transactions /> : <Navigate to="/login" />
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;