require("dotenv").config();

const env = require("./config/env");
const mongoose = require("mongoose");

const app = require("./app");
const connectDB = require("./config/database");
const logger = require("./utils/logger");

const PORT = env.PORT;

const startServer = async () => {
  try {
    logger.info("Starting server...");

    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed");

          process.exit(0);
        } catch (error) {
          logger.error(`Error during graceful shutdown: ${error.message}`);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
