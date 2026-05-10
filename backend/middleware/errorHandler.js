const logger = require("../utils/logger");

/**
 * Centralized error handling middleware.
 * Place as the LAST middleware in Express.
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`[ERROR] ${req.method} ${req.path}:`, { message: err.message, stack: err.stack });

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: "Validation failed.",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, error: "Invalid or expired session." });
  }

  // MySQL errors
  if (err.code && err.code.startsWith("ER_")) {
    return res.status(500).json({ success: false, error: "Database error." });
  }

  // Default
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error." : err.message,
  });
};

/**
 * Wrap async route handlers to catch errors automatically.
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler };
