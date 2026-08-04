const express = require("express");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const healthRoutes = require("./routes/healthRoutes");

const errorMiddleware = require("./middleware/errorMiddleware");
const requestLogger = require("./middleware/requestLogger");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
} = require("./config/security");

const app = express();

/**
 * ==========================
 * Security Middleware
 * ==========================
 */
app.use(helmetMiddleware);
app.use(corsMiddleware);

/**
 * Request Logging
 */
app.use(requestLogger);

/**
 * Health routes
 * Keep these before the rate limiter.
 */
app.use(healthRoutes);

/**
 * JSON Body Parser (1MB limit)
 */
app.use(express.json({ limit: "1mb" }));

/**
 * Swagger Documentation
 * Exposed without rate limiting.
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Global API Rate Limiter
 * Applied only to application APIs.
 */
app.use("/api", apiLimiter);

/**
 * ==========================
 * Application Routes
 * ==========================
 */
app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);

/**
 * ==========================
 * Info Routes
 * ==========================
 */
app.get("/", (req, res) => {
  res.json({
    message: "Image Processing Service API",
  });
});

app.get("/about", (req, res) => {
  res.json({
    name: "Image Processing Service",
    version: "1.0.0",
  });
});

/**
 * ==========================
 * Error Middleware
 * ==========================
 */
app.use(errorMiddleware);

module.exports = app;
