const express = require("express");
const db = require("../db");
const router = express.Router();

// Upsert manual label
router.post("/:review_id", async (req, res) => {
  try {
    const { review_id } = req.params;
    const { actual_sentiment } = req.body;

    const q = `
      INSERT INTO manual_labels (review_id, actual_sentiment)
      VALUES ($1,$2)
      ON CONFLICT (review_id)
      DO UPDATE SET actual_sentiment = EXCLUDED.actual_sentiment, labeled_at = now()
      RETURNING *
    `;

    const result = await db.query(q, [review_id, actual_sentiment]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
