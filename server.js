const initDb = require("./initDb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { pool } = require("./db");

const uploadsRoutes = require("./routes/uploads");
const reviewsRoutes = require("./routes/reviews");
const labelsRoutes = require("./routes/labels");
const analyticsRoutes = require("./routes/analytics");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ✅ TEST ROUTE (Express)
app.get("/", (req, res) => res.send("MOVEIT API running ✅"));

// ✅ TEST ROUTE (Database)
app.get("/api/health/db", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (err) {
    console.error("DB health error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Routes
app.use("/api/uploads", uploadsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/labels", labelsRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 3000;
initDb();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
