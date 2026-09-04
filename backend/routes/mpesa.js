const express = require('express');
const router = express.Router();
const { getDb, isMySQL, jRead, jWrite, now } = require('../db/connection');
router.post('/mpesa/stk-push', async (req, res) => {
try {
const { phone, deliveryId, riderId } = req.body;
if (!phone || !deliveryId) return res.status(400).json({ error: 'Phone number and deliveryId re
quired' });
const amount = Number(process.env.MPESA_AMOUNT) || 200;
const checkoutRequestId = 'ws_CO_' + Date.now();
const t = now();
const d = jRead();
if (!d.payments) d.payments = [];
d.payments.push({ id: 'PAY-' + Date.now(), deliveryId, riderId: riderId || null, phone, amount,
status: 'PENDING', checkoutRequestId, createdAt: t });
jWrite(d);
res.json({ ok: true, message: 'STK Push initiated successfully', checkoutRequestId });
} catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/mpesa/status/:id', async (req, res) => {
try {
const d = jRead();
const delivery = (d.deliveries || []).find(x => x.id === req.params.id);
res.json({ paid: delivery?.paymentStatus === 'PAID', paymentStatus: delivery?.paymentStatus ||
'UNPAID' });
} catch (err) { res.status(500).json({ error: 'Server error' }); }
});
module.exports = router;