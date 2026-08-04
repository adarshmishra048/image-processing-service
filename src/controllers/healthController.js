const mongoose = require("mongoose");

exports.livez = (req, res) => {
  res.status(200).json({
    status: "alive",
  });
};

exports.readyz = async (req, res) => {
  try {
    // Ensure Mongoose is connected
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        status: "not ready",
        mongo: "down",
      });
    }

    // Ping MongoDB
    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      status: "ready",
      mongo: "up",
    });
  } catch (error) {
    return res.status(503).json({
      status: "not ready",
      mongo: "down",
    });
  }
};
