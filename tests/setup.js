process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load .env only for local development
if (!process.env.MONGODB_URI) {
  require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
    quiet: true,
  });
}

beforeAll(async () => {
  // Ensure upload folders exist
  fs.mkdirSync(path.join(__dirname, "../uploads/originals"), {
    recursive: true,
  });

  fs.mkdirSync(path.join(__dirname, "../uploads/transformed"), {
    recursive: true,
  });

  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

jest.setTimeout(30000);
