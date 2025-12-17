const express = require("express");
const db = require("../db");
const router = express.Router();

// Dashboard summary
router.get("/summary", async (req, res) => {
  try {
    const q = `
      WITH latest_pred AS (
        SELECT DISTINCT ON (review_id)
          review_id, predicted_sentiment
        FROM predictions
        ORDER BY review_id, predicted_at DESC
      )
      SELECT
        (SELECT COUNT(*) FROM reviews) AS total_reviews,
        (SELECT COUNT(*) FROM latest_pred WHERE predicted_sentiment='positive') AS positive,
        (SELECT COUNT(*) FROM latest_pred WHERE predicted_sentiment='neutral') AS neutral,
        (SELECT COUNT(*) FROM latest_pred WHERE predicted_sentiment='negative') AS negative
    `;
    const r = await db.query(q);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual vs predicted counts (for confusion matrix style stats)
router.get("/manual-metrics", async (req, res) => {
  try {
    const q = `
      WITH latest_pred AS (
        SELECT DISTINCT ON (review_id)
          review_id, predicted_sentiment
        FROM predictions
        ORDER BY review_id, predicted_at DESC
      )
      SELECT
        ml.actual_sentiment,
        lp.predicted_sentiment,
        COUNT(*)::int AS count
      FROM manual_labels ml
      JOIN latest_pred lp ON lp.review_id = ml.review_id
      GROUP BY ml.actual_sentiment, lp.predicted_sentiment
      ORDER BY ml.actual_sentiment, lp.predicted_sentiment
    `;
    const r = await db.query(q);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
