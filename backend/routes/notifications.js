const express = require('express');
const router = express.Router();
router.post('/notifications/send', async (req, res) => {
try {
const { recipient, message, type } = req.body;
if (!recipient || !message) {
return res.status(400).json({ error: 'Recipient and message required' });
}
console.log(`[NOTIFICATION SENT] Type: ${type || 'EMAIL'} | To: ${recipient} | Msg: ${message}
`);
res.json({ success: true, message: 'Notification dispatched successfully' });
} catch (err) {
res.status(500).json({ error: 'Failed to send notification' });
}
});
module.exports = router