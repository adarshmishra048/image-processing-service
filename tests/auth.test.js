const request = require("supertest");
const app = require("../src/app");

describe("Auth API", () => {
  it("should register a user", async () => {
    const unique = Date.now();

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: `testuser${unique}`,
        email: `test${unique}@example.com`,
        password: "password123",
      });

    expect(res.statusCode).toBe(201);

    expect(res.body.message).toBe("User registered successfully");

    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(`testuser${unique}`);
    expect(res.body.user.email).toBe(`test${unique}@example.com`);
  });
});
