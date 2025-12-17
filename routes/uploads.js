const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const XLSX = require("xlsx");
const db = require("../db");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function normalizeRow(row) {
  // Accept many possible column names from different files
  const text =
    row.text ||
    row.review ||
    row.feedback ||
    row.comment ||
    row.message ||
    row.Review ||
    row.Feedback ||
    "";

  const source = row.source || row.platform || row.Source || row.Platform || "Mixed";
  const ratingRaw = row.rating || row.Rating || null;
  const dateRaw = row.date || row.review_date || row.Date || null;

  const rating = ratingRaw === null || ratingRaw === "" ? null : Number(ratingRaw);
  const review_date = dateRaw ? new Date(dateRaw) : null;

  return { text: String(text).trim(), source: String(source).trim(), rating, review_date };
}

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const platform = req.body.platform || "Mixed";
    const filename = req.file.originalname;

    const uploadRow = await db.query(
      "INSERT INTO uploads (filename, platform) VALUES ($1,$2) RETURNING id, uploaded_at",
      [filename, platform]
    );
    const upload_id = uploadRow.rows[0].id;

    let rows = [];

    if (filename.toLowerCase().endsWith(".csv")) {
      const csvText = req.file.buffer.toString("utf8");
      rows = parse(csvText, { columns: true, skip_empty_lines: true });
    } else if (filename.toLowerCase().match(/\.(xlsx|xls)$/)) {
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } else {
      return res.status(400).json({ error: "Only CSV/XLSX supported" });
    }

    const cleaned = rows
      .map(normalizeRow)
      .filter((r) => r.text && r.text.length > 0);

    if (cleaned.length === 0) {
      return res.status(400).json({ error: "No valid rows found (missing text column)" });
    }

    // Insert in chunks
    const insertedIds = [];
    const chunkSize = 500;

    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);

      const values = [];
      const placeholders = chunk
        .map((r, idx) => {
          const base = idx * 5;
          values.push(upload_id, r.source, r.review_date, r.rating, r.text);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
        })
        .join(",");

      const q = `
        INSERT INTO reviews (upload_id, source, review_date, rating, text)
        VALUES ${placeholders}
        RETURNING id
      `;

      const result = await db.query(q, values);
      result.rows.forEach((x) => insertedIds.push(x.id));
    }

    res.json({
      upload_id,
      inserted: insertedIds.length,
      review_ids: insertedIds, // you can remove this later if too large
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed", details: err.message });
  }
});

module.exports = router;
