const path = require('path');
const fs = require('fs');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
let db = null;
let useMySQL = false;

function seedLocalDb() {
  const defaultUsers = [
    { id: 'USR-1', name: 'Mary Njeri', email: 'mary@shop.co.ke', password: 'password', role: 'retailer', phone: '+254700000001' },
    { id: 'USR-2', name: 'Daniel Kiptoo', email: 'daniel@dispatch.co.ke', password: 'password', role: 'dispatcher', phone: '+254700000002' },
    { id: 'USR-3', name: 'Brian Otieno', email: 'brian@reflex.co.ke', password: 'password', role: 'rider', phone: '+254700000003' }
  ];

  fs.mkdirSync(path.dirname(FILE), { recursive: true });

  if (!fs.existsSync(FILE)) {
    const initial = { users: defaultUsers, deliveries: [], payments: [] };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  const existing = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!Array.isArray(existing.users) || existing.users.length === 0) {
    existing.users = defaultUsers;
    existing.deliveries = existing.deliveries || [];
    existing.payments = existing.payments || [];
    fs.writeFileSync(FILE, JSON.stringify(existing, null, 2));
  }

  return existing;
}

async function initStorage() {
  if (!process.env.DB_USER) {
    seedLocalDb();
    console.log('[DB] Running in LOCAL mode (JSON fallback: data/db.json)');
    return;
  }

  try {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'reflex_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });
    await pool.query('SELECT 1');
    db = pool;
    useMySQL = true;
    console.log('[DB] MySQL Connected Successfully');
  } catch (err) {
    db = null;
    useMySQL = false;
    seedLocalDb();
    console.log('[DB] MySQL failed, falling back to local JSON db.json:', err.message);
  }
}

const jRead = () => seedLocalDb();
const jWrite = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
const now = () => new Date().toISOString();

module.exports = { initStorage, getDb: () => db, isMySQL: () => useMySQL, jRead, jWrite, now };
