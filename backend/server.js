const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const meetingsRoutes = require("./routes/meetings");
const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "state-cyber-cell-backend",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/audit-logs", auditRoutes);

// Catch 404 and return clean JSON error instead of HTML
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: `API Route Not Found: ${req.method} ${req.originalUrl}`
  });
});

// Global 500 Error Handler returning clean JSON error instead of HTML stacktrace
app.use((err, req, res, next) => {
  console.error("Backend Server Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    status: "error",
    message: err.message || "Internal server error occurred while processing request."
  });
});

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🟢 Express Backend running on http://localhost:${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`🟢 Express Backend is ALREADY active and running on http://localhost:${PORT}`);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
