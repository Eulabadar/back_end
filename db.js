const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // IMPORTANT for Render External DB
  connectionTimeoutMillis: 10000,       // fail in 10s instead of hanging forever
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
