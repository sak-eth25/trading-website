import React, { useState } from 'react';
import './Login.css';

const API = 'http://localhost:4000';

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim() || (isSignup && !email.trim())) {
      setError('Please fill all required fields.');
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const endpoint = isSignup ? '/signup' : '/login';
    const payload = isSignup
      ? { username: username.trim(), email: email.trim(), password }
      : { username: username.trim(), password };

    fetch(API + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || data.error || 'Authentication failed.');
        }

        return data;
      })
      .then((data) => {
        onLogin(data.user || data);
      })
      .catch((err) => {
        setError(err.message || 'Unable to connect to server.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const toggleMode = (e) => {
    e.preventDefault();
    setIsSignup((prev) => !prev);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-container">
      {/* Decorative background elements */}
      <div className="login-decoration login-decoration-1"></div>
      <div className="login-decoration login-decoration-2"></div>
      <div className="login-decoration login-decoration-3"></div>
      
      <div className="login-card">
        <h1 className="login-title">{isSignup ? 'Signup' : 'Login'}</h1>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="Enter email"
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="Enter password"
            />
          </div>

          {isSignup && (
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}

          <button className="login-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isSignup
                ? 'Creating account...'
                : 'Logging in...'
              : isSignup
                ? 'Signup'
                : 'Login'}
          </button>
        </form>

        <p className="login-footer">
          {isSignup ? 'Already have an account? ' : 'New user? '}
          <a href="#" onClick={toggleMode}>
            {isSignup ? 'Login here' : 'Create account'}
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;
