const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('[DB] PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('[DB ERROR] PostgreSQL error:', err.message);
  process.exit(1);
});

module.exports = pool;
