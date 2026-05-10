const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Sentry = require("@sentry/node");
const { validateEnv } = require("./utils/envValidator");
const { sanitizeInputs, limiter } = require("./middleware/auth");
require("dotenv").config();

const { testConnection } = require("./db");
const { runMigrations } = require("./db/migrations");
const { verifyToken } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const settingsManager = require("./services/settingsManager");

const app = express();

// ── Sentry Initialization ───────────────────────────────────────
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
// ── Global middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}));

// Apply security middleware
app.use(sanitizeInputs);
app.use(limiter);

// ── Base Route ─────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("MindMate API is running.");
});

// ── Health Check ─────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ── Protected routes (require valid JWT) ──────────────────
app.use("/api/chat", verifyToken, require("./routes/chat"));
app.use("/api/mood", verifyToken, require("./routes/mood"));
app.use("/api/admin", verifyToken, require("./routes/admin"));
app.use("/api/user", verifyToken, require("./routes/user"));
app.use("/api/support", verifyToken, require("./routes/support"));

// ── Error handling (must be last) ────────────────────────────────
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5002;

const start = async () => {
  console.log("Starting MindMate API...");
  console.log(`Port: ${PORT}`);
  console.log(`Node Env: ${process.env.NODE_ENV}`);

  // Start listening immediately so Railway healthcheck passes
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
    console.log("Healthcheck endpoint available at /health");
  });

  try {
    validateEnv();
    await testConnection();
    await runMigrations();
    await settingsManager.loadSettings();
    console.log("All systems initialized successfully.");
  } catch (err) {
    console.error("Initialization warning (app is still running):", err.message);
    console.error("Please check your environment variables (DATABASE_URL, etc.)");
  }
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});