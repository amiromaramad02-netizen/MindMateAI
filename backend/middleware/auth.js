const admin = require("firebase-admin");
const rateLimit = require("express-rate-limit");
const xss = require("xss");
const logger = require("../utils/logger");
const { findByUid } = require("../models/User");

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    logger.info("Firebase Admin SDK initialized.");
  } else {
    logger.warn("Firebase environment variables missing. Auth verification will fail.");
  }
}

// ── Verify token middleware ─────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Not authenticated. Missing Bearer token." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Fetch user from DB to get the role
    const dbUser = await findByUid(decodedToken.uid);
    req.user = { ...decodedToken, role: dbUser?.role || "user" };
    
    next();
  } catch (error) {
    logger.error("Token verification failed:", error.message);
    return res.status(401).json({ success: false, error: "Invalid or expired session." });
  }
};

// ── Require admin middleware ────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user?.email}`);
    return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
  }
};

// Apply input sanitization middleware — recursively clean string fields
const sanitizeInputs = (req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val === "string") return xss(val);
    if (typeof val === "object" && val !== null) {
      Object.keys(val).forEach((k) => { val[k] = sanitizeValue(val[k]); });
    }
    return val;
  };
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  next();
};

// Apply rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

module.exports = {
  verifyToken,
  requireAdmin,
  sanitizeInputs,
  limiter,
};
