const request = require("supertest");
const path = require("path");

const app = require("../src/app");

describe("Image API", () => {
  it("should upload an image for an authenticated user", async () => {
    const unique = Date.now();

    // Register
    await request(app)
      .post("/api/auth/register")
      .send({
        username: `user${unique}`,
        email: `user${unique}@example.com`,
        password: "password123",
      });

    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: `user${unique}@example.com`,
        password: "password123",
      });

    const token = loginRes.body.token;

    // Upload
    const uploadRes = await request(app)
      .post("/api/images")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", path.join(__dirname, "fixtures/test.jpg"));

    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.body.image).toBeDefined();
    expect(uploadRes.body.image.filename).toBeDefined();
  });
});
