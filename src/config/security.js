const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

/**
 * Global API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 100, // 100 requests per IP

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Strict limiter for authentication
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

/**
 * Limiter for expensive image transformations
 */
const transformLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 30,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many image transformations. Please try again later.",
  },
});

/**
 * Helmet configuration
 */
const helmetMiddleware = helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin",
  },
});

/**
 * CORS configuration
 */
const allowedOrigins = [
  "http://localhost:5173", // Vite frontend
  "https://image-processing-service-8wui.onrender.com", // Backend itself
];

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,
});

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  authLimiter,
  transformLimiter,
};
