process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

jest.setTimeout(30000);
