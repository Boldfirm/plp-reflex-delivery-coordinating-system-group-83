const express = require('express');
const router = express.Router();
const { getDb, isMySQL, jRead, jWrite } = require('../db/connection');

router.get('/riders', (req, res) => {
  try {
    const d = jRead();
    const riders = (d.users || [])
      .filter(user => user.role === 'rider')
      .map(({ password, ...user }) => user);
    res.json(riders);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch riders' }); }
});

router.post('/riders', async (req, res) => {
  try {
    const { role, name, email, password, phone } = req.body;
    if (role !== 'dispatcher') return res.status(403).json({ error: 'Access denied: Dispatchers only' });
    const cleanEmail = email.trim().toLowerCase();
    const newId = 'USR-' + Date.now();

    const d = jRead();
    if (!d.users) d.users = [];
    const newUser = { id: newId, name: name.trim(), email: cleanEmail, password, role: 'rider', phone: phone || null };
    d.users.push(newUser);
    jWrite(d);
    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err) { res.status(500).json({ error: 'Failed to create rider account' }); }
});

router.get('/earnings/:riderId', (req, res) => {
  try {
    const d = jRead();
    const payments = (d.payments || []).filter(p => p.riderId === req.params.riderId && p.status === 'PAID');
    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    res.json({ riderId: req.params.riderId, payments, totalEarnings: total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch earnings' }); }
});

module.exports = router;
