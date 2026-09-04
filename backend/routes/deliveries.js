const express = require('express');
const router = express.Router();
const { getDb, isMySQL, jRead, jWrite, now } = require('../db/connection');
router.get('/deliveries', async (req, res) => {
try {
const { role, userId } = req.query;
if (isMySQL()) {
let sql = `SELECT d.*, ru.name AS retailerName, ri.name AS riderName
FROM deliveries d
LEFT JOIN users ru ON ru.id = d.retailerId
LEFT JOIN users ri ON ri.id = d.riderId`;
const params = [];
if (role === 'rider') { sql += ' WHERE (d.status=? OR d.riderId=?)'; params.push('Open', user
Id); }
if (role === 'retailer') { sql += ' WHERE d.retailerId=?'; params.push(userId); }
const [deliveries] = await getDb().query(sql, params);
return res.json(deliveries);
}
const d = jRead();
let list = d.deliveries || [];
if (role === 'rider') list = list.filter(x => x.status === 'Open' || x.riderId === userId);
if (role === 'retailer') list = list.filter(x => x.retailerId === userId);
res.json(list);
} catch (err) { res.status(500).json({ error: 'Failed to fetch deliveries' }); }
});
router.post('/deliveries', async (req, res) => {
try {
const { retailerId, customerName, customerPhone, address, item } = req.body;
if (!retailerId || !customerName || !customerPhone || !address || !item) {
return res.status(400).json({ error: 'All delivery fields are required' });
}
const t = now();
const d = jRead();
const newId = `DEL-${Math.max(1000, ...(d.deliveries || []).map(x => Number(x.id.replace('DEL-
', '')) || 1000)) + 1}`;
const newDelivery = {
id: newId, retailerId, customerName, customerPhone, address, item,
riderId: null, status: 'Open', paymentStatus: 'UNPAID', createdAt: t, updatedAt: t
};
if (!d.deliveries) d.deliveries = [];
d.deliveries.push(newDelivery);
jWrite(d);
res.status(201).json(newDelivery);
} catch (err) { res.status(500).json({ error: 'Failed to create delivery' }); }
});
module.exports = router;