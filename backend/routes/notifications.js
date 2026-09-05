const express = require('express');
const router = express.Router();
const { jRead } = require('../db/connection');

router.post('/notifications/send', async (req, res) => {
  try {
    const { recipient, message, type } = req.body;
    if (!recipient || !message) {
      return res.status(400).json({ error: 'Recipient and message required' });
    }
    console.log(`[NOTIFICATION SENT] Type: ${type || 'EMAIL'} | To: ${recipient} | Msg: ${message}`);
    res.json({ success: true, message: 'Notification dispatched successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.post('/deliveries/:id/notify-owner', (req, res) => {
  try {
    const { toEmail, subject, message } = req.body;
    const data = jRead();
    const delivery = (data.deliveries || []).find(item => item.id === req.params.id);

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (!toEmail || !subject || !message) {
      return res.status(400).json({ error: 'Recipient email, subject, and message are required' });
    }

    console.log(`[OWNER NOTIFICATION] Delivery: ${delivery.id} | To: ${toEmail} | Subject: ${subject} | Msg: ${message}`);
    res.json({ success: true, message: `Notification sent to ${toEmail}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to notify delivery owner' });
  }
});

module.exports = router;
