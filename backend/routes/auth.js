const express = require('express');
const router = express.Router();
const { getDb, isMySQL, jRead } = require('../db/connection');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isMySQL()) {
      const [rows] = await getDb().query(
        'SELECT * FROM users WHERE LOWER(email)=? AND password=?',
        [cleanEmail, password]
      );
      if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
      const { password: _pw, ...safeUser } = rows[0];
      return res.json(safeUser);
    }

    const d = jRead();
    const user = (d.users || []).find(x => x.email.toLowerCase() === cleanEmail && x.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication internal server error' });
  }
});

module.exports = router;
