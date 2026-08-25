import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { connectDB } from "../db/connect.js";
import User from "../models/User.js";
import {
  createTestUser,
  loginTestUser,
  authHeader,
} from "./helpers/testAuth.js";

const TEST_EMAIL = "seed@test.com";
const TEST_PASSWORD = "password123";

describe("POST /api/auth/signup", () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: TEST_EMAIL });
  });

  afterAll(async () => {
    await User.deleteOne({ email: TEST_EMAIL });
    await mongoose.disconnect();
  });

  it("returns 201 with token for valid signup", async () => {
    const res = await createTestUser(app, {
      name: "Test User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({
      name: "Test User",
      email: TEST_EMAIL,
    });
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ email: "missing-fields@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Name, email, and password are required"
    );
  });

  it("returns 409 when email already exists", async () => {
    const res = await createTestUser(app, {
      name: "Duplicate User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "User account already exists, please login"
    );
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: TEST_EMAIL });
    await User.create({
      name: "Test User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
  });

  afterAll(async () => {
    await User.deleteOne({ email: TEST_EMAIL });
    await mongoose.disconnect();
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email and password are required");
  });

  it("returns 401 when email is not found", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@test.com", password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No user found with that email");
  });

  it("returns 401 with wrong password", async () => {
    const res = await loginTestUser(app, {
      email: TEST_EMAIL,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid password");
  });

  it("returns token with correct credentials", async () => {
    const res = await loginTestUser(app, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });
});
