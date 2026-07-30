const request = require("supertest");
const sharp = require("sharp");
const app = require("../src/app");

describe("Image API", () => {
  it("should upload an image for an authenticated user", async () => {
    // Register user
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({
        username: "testuser" + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: "password123",
      });

    // Login
    const loginRes = await request(app).post("/api/auth/login").send({
      email: registerRes.body.user.email,
      password: "password123",
    });

    const token = loginRes.body.token;

    // Create a real JPEG buffer
    const imageBuffer = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    // Upload image
    const uploadRes = await request(app)
  .post("/api/images")
  .set("Authorization", `Bearer ${token}`)
  .attach("image", imageBuffer, "test.jpg");

console.log("STATUS:", uploadRes.statusCode);
console.log("BODY:", JSON.stringify(uploadRes.body, null, 2));

expect(uploadRes.statusCode).toBe(201);
expect(uploadRes.body.image).toBeDefined();
expect(uploadRes.body.image.filename).toBeDefined();
  });
});
