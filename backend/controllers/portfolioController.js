const db = require('../db');

exports.getPortfolio = async (req, res) => {
  const userId = req.session.user.user_id;

  const result = await db.query(`
    SELECT p.stock_id, s.symbol, p.quantity, p.avg_price, s.current_price,
    (p.quantity * s.current_price) AS value
    FROM portfolio p
    JOIN stocks s ON p.stock_id = s.stock_id
    WHERE p.user_id = $1 AND p.quantity > 0
  `, [userId]);

  res.json(result.rows);
};

exports.getBalance = async (req, res) => {
  const userId = req.session.user.user_id;

  const result = await db.query(
    'SELECT balance FROM users WHERE user_id = $1',
    [userId]
  );

  res.json({ balance: result.rows[0].balance });
};