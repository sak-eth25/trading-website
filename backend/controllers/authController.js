const bcrypt = require('bcrypt');
const db = require('../db');

exports.signup = async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING user_id',
      [username, hash, email]
    );

    const user = { user_id: result.rows[0].user_id, username };
    req.session.user = user;

    res.status(201).json(user);

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: "User exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return res.status(401).json({ message: "Wrong password" });
  }

  req.session.user = { user_id: user.user_id, username: user.username };
  res.json(req.session.user);
};

exports.isLoggedIn = (req, res) => {
  if (req.session.user) {
    res.json({ isLoggedIn: true, user: req.session.user });
  } else {
    res.json({ isLoggedIn: false });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out" });
  });
};