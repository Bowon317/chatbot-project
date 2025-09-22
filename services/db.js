require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = process.env.MYSQL_PORT || 3306;
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'dbline';

let pool;
async function initPool() {
  if (pool) return pool;
  pool = mysql.createPool({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0, charset: 'utf8mb4' });
  return pool;
}

async function setUser(userId, displayName) {
  const p = await initPool();
  await p.execute(`INSERT INTO users (id, displayName, lastSeen) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), lastSeen = VALUES(lastSeen)`, [userId, displayName || null, Date.now()]);
}

async function setContext(userId, state, meta) {
  const p = await initPool();
  await p.execute(`INSERT INTO context (userId, state, meta) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state = VALUES(state), meta = VALUES(meta)`, [userId, state, JSON.stringify(meta || {})]);
}

async function getContext(userId) {
  const p = await initPool();
  const [rows] = await p.execute(`SELECT state, meta FROM context WHERE userId = ?`, [userId]);
  if (!rows || rows.length === 0) return { state: null, meta: {} };
  const row = rows[0];
  try { return { state: row.state, meta: row.meta ? JSON.parse(row.meta) : {} }; } catch (e) { return { state: row.state, meta: {} }; }
}

async function addHistory(userId, eventType, payload) {
  const p = await initPool();
  if (userId) await p.execute(`INSERT INTO users (id, lastSeen) VALUES (?, ?) ON DUPLICATE KEY UPDATE lastSeen = VALUES(lastSeen)`, [userId, Date.now()]);
  await p.execute(`INSERT INTO history (userId, eventType, payload, createdAt) VALUES (?, ?, ?, ?)`, [userId, eventType, JSON.stringify(payload || {}), Date.now()]);
}

module.exports = { setUser, setContext, getContext, addHistory };
