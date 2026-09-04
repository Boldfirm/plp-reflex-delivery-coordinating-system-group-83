require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const { initStorage } = require('./db/connection');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
// Mount Modular Routers
app.use('/api', require('./routes/auth'));
// Brian
app.use('/api', require('./routes/deliveries'));
// Jacob
app.use('/api', require('./routes/riders'));
// Olajide
app.use('/api', require('./routes/mpesa'));
// Bianca
app.use('/api', require('./routes/notifications')); // Victor
// Catch-all SPA route
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));
initStorage().then(() => {
app.listen(PORT, () => console.log(`
});
🚀 Reflex Deliveries running on http://localhost:${PORT}`))