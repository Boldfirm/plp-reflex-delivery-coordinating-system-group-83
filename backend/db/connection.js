const path = require('path');
const fs = require('fs');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
let db = null;
let useMySQL = false;
async function initStorage() {
if (!process.env.DB_USER) {
console.log('[DB] Running in LOCAL mode (JSON fallback: db.json)');
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
console.log('[DB] MySQL failed, falling back to local JSON db.json:', err.message);
}
}
const jRead = () => {
if (!fs.existsSync(FILE)) {
fs.mkdirSync(path.dirname(FILE), { recursive: true });
fs.writeFileSync(FILE, JSON.stringify({ users: [], deliveries: [], payments: [] }, null, 2));
}
return JSON.parse(fs.readFileSync(FILE, 'utf8'));
};
const jWrite = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
const now = () => new Date().toISOString();
module.exports = { initStorage, getDb: () => db, isMySQL: () => useMySQL, jRead, jWrite, now };