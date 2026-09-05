const express = require('express');
const router = express.Router();
const { getDb, isMySQL, jRead, jWrite, now } = require('../db/connection');

function withNames(delivery, users) {
  const retailer = users.find(user => user.id === delivery.retailerId);
  const rider = users.find(user => user.id === delivery.riderId);
  return {
    ...delivery,
    riderName: rider ? rider.name : null,
    retailerName: retailer ? retailer.name : null,
    retailerEmail: retailer ? retailer.email : null
  };
}

function findLocalDelivery(data, id) {
  return (data.deliveries || []).find(delivery => delivery.id === id);
}

function addHistory(delivery, status, note) {
  if (!Array.isArray(delivery.history)) delivery.history = [];
  delivery.history.push({ status, at: now(), note });
  delivery.status = status;
  delivery.updatedAt = now();
}

router.get('/deliveries', async (req, res) => {
  try {
    const { role, userId } = req.query;
    if (isMySQL()) {
      let sql = `SELECT d.*, ru.name AS retailerName, ri.name AS riderName 
                 FROM deliveries d
                 LEFT JOIN users ru ON ru.id = d.retailerId 
                 LEFT JOIN users ri ON ri.id = d.riderId`;
      const params = [];
      if (role === 'rider') { sql += ' WHERE (d.status=? OR d.riderId=?)'; params.push('Open', userId); }
      if (role === 'retailer') { sql += ' WHERE d.retailerId=?'; params.push(userId); }
      const [deliveries] = await getDb().query(sql, params);
      return res.json(deliveries);
    }
    const d = jRead();
    let list = (d.deliveries || []).map(delivery => withNames(delivery, d.users || []));
    if (role === 'rider') list = list.filter(x => x.status === 'Open' || x.riderId === userId);
    if (role === 'retailer') list = list.filter(x => x.retailerId === userId);
    res.json(list);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch deliveries' }); }
});

router.get('/deliveries/:id', (req, res) => {
  try {
    const d = jRead();
    const delivery = findLocalDelivery(d, req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json(withNames(delivery, d.users || []));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch delivery' }); }
});

router.post('/deliveries', async (req, res) => {
  try {
    const { retailerId, customerName, customerPhone, address, item } = req.body;
    if (!retailerId || !customerName || !customerPhone || !address || !item) {
      return res.status(400).json({ error: 'All delivery fields are required' });
    }
    const t = now();
    const d = jRead();
    const newId = `DEL-${Math.max(1000, ...(d.deliveries || []).map(x => Number(x.id.replace('DEL-', '')) || 1000)) + 1}`;
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

router.patch('/deliveries/:id/accept', (req, res) => {
  try {
    const { riderId } = req.body;
    const d = jRead();
    const delivery = findLocalDelivery(d, req.params.id);
    const rider = (d.users || []).find(user => user.id === riderId && user.role === 'rider');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (!rider) return res.status(400).json({ error: 'A valid rider is required' });
    if (delivery.status !== 'Open') return res.status(409).json({ error: 'Delivery is no longer open' });
    delivery.riderId = riderId;
    addHistory(delivery, 'Claimed', `Claimed by ${rider.name}`);
    jWrite(d);
    res.json(withNames(delivery, d.users || []));
  } catch (err) { res.status(500).json({ error: 'Failed to claim delivery' }); }
});

router.patch('/deliveries/:id/assign', (req, res) => {
  try {
    const { riderId } = req.body;
    const d = jRead();
    const delivery = findLocalDelivery(d, req.params.id);
    const rider = (d.users || []).find(user => user.id === riderId && user.role === 'rider');
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (!rider) return res.status(400).json({ error: 'A valid rider is required' });
    delivery.riderId = riderId;
    addHistory(delivery, 'Assigned', `Accepted by ${rider.name}`);
    jWrite(d);
    res.json(withNames(delivery, d.users || []));
  } catch (err) { res.status(500).json({ error: 'Failed to assign delivery' }); }
});

router.patch('/deliveries/:id/status', (req, res) => {
  try {
    const { status, riderId } = req.body;
    const d = jRead();
    const delivery = findLocalDelivery(d, req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (!status) return res.status(400).json({ error: 'Status is required' });
    if (riderId && delivery.riderId !== riderId) {
      return res.status(403).json({ error: 'Only the assigned rider can update this delivery' });
    }
    addHistory(delivery, status, `Status updated by ${riderId ? 'rider' : 'business owner'}`);
    jWrite(d);
    res.json(withNames(delivery, d.users || []));
  } catch (err) { res.status(500).json({ error: 'Failed to update delivery status' }); }
});

router.delete('/deliveries/:id', (req, res) => {
  try {
    const d = jRead();
    const index = (d.deliveries || []).findIndex(delivery => delivery.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Delivery not found' });
    d.deliveries.splice(index, 1);
    jWrite(d);
    res.json({ message: 'Delivery deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete delivery' }); }
});

module.exports = router;
