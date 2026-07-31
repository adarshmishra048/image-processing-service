const express = require("express");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const requestLogger = require("./middleware/requestLogger");

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
app.use(requestLogger);

/**
 * JSON Body Parser (1MB limit)
 */
app.use(express.json({ limit: "1mb" }));

/**
 * Global API Rate Limiter
 */
app.use(apiLimiter);

/**
 * Swagger Documentation
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * ==========================
 * Routes
 * ==========================
 */
app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);

/**
 * ==========================
 * Health & Info Routes
 * ==========================
 */
app.get("/", (req, res) => {
  res.json({
    message: "Image Processing Service API",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
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
