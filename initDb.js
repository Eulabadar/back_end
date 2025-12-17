// initDb.js
const { pool } = require("./db");

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id BIGSERIAL PRIMARY KEY,
        review_id BIGINT NOT NULL,
        predicted_sentiment TEXT NOT NULL
          CHECK (predicted_sentiment IN ('positive','neutral','negative')),
        predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS predictions_review_id_predicted_at_idx
        ON predictions (review_id, predicted_at DESC);

      CREATE TABLE IF NOT EXISTS manual_labels (
        id BIGSERIAL PRIMARY KEY,
        review_id BIGINT NOT NULL,
        actual_sentiment TEXT NOT NULL
          CHECK (actual_sentiment IN ('positive','neutral','negative')),
        labeled_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

module.exports = initDb;
