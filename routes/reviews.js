const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { upload_id, source, limit = 50, offset = 0 } = req.query;

    const filters = [];
    const params = [];
    let p = 1;

    if (upload_id) {
      filters.push(`r.upload_id = $${p++}`);
      params.push(upload_id);
    }
    if (source) {
      filters.push(`r.source = $${p++}`);
      params.push(source);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const q = `
      SELECT
        r.*,
        p.predicted_sentiment,
        p.confidence,
        p.model_version,
        p.predicted_at
      FROM reviews r
      LEFT JOIN LATERAL (
        SELECT predicted_sentiment, confidence, model_version, predicted_at
        FROM predictions
        WHERE review_id = r.id
        ORDER BY predicted_at DESC
        LIMIT 1
      ) p ON true
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${p++} OFFSET $${p++}
    `;

    params.push(Number(limit), Number(offset));

    const result = await db.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save prediction for a review
router.post("/:id/predict", async (req, res) => {
  try {
    const review_id = req.params.id;
    const { predicted_sentiment, confidence, model_version = "v1" } = req.body;

    const r = await db.query(
      `INSERT INTO predictions (review_id, predicted_sentiment, confidence, model_version)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [review_id, predicted_sentiment, confidence, model_version]
    );

    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
