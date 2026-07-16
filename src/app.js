const express = require("express");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);

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

// Error middleware
app.use(errorMiddleware);

module.exports = app;
