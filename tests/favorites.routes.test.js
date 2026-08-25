import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { connectDB } from "../db/connect.js";
import User from "../models/User.js";
import Favorite from "../models/Favorites.js";
import {
  createTestUser,
  loginTestUser,
  authHeader,
} from "./helpers/testAuth.js";

const TEST_EMAIL = "favorites@test.com";
const TEST_PASSWORD = "password123";
const BREWERY_ID = "b58f8e";

describe("Favorites routes", () => {
  let token;

  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: TEST_EMAIL });
    await Favorite.deleteMany({ breweryId: BREWERY_ID });

    await createTestUser(app, {
      name: "Favorites User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    const loginRes = await loginTestUser(app, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await Favorite.deleteMany({ breweryId: BREWERY_ID });
    await User.deleteOne({ email: TEST_EMAIL });
    await mongoose.disconnect();
  });

  describe("GET /api/favorites/me", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/favorites/me");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Not authorized, no token");
    });

    it("returns favorites for the logged-in user", async () => {
      const res = await request(app)
        .get("/api/favorites/me")
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/favorites", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/favorites")
        .send({ breweryId: BREWERY_ID });

      expect(res.status).toBe(401);
    });

    it("returns 201 when saving a favorite", async () => {
      const res = await request(app)
        .post("/api/favorites")
        .set(authHeader(token))
        .send({ breweryId: BREWERY_ID });

      expect(res.status).toBe(201);
      expect(res.body.breweryId).toBe(BREWERY_ID);
    });

    it("returns 409 when favoriting the same brewery again", async () => {
      const res = await request(app)
        .post("/api/favorites")
        .set(authHeader(token))
        .send({ breweryId: BREWERY_ID });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Already a favorite");
    });
  });

  describe("DELETE /api/favorites/:id", () => {
    it("returns 404 when favorite is not found", async () => {
      const res = await request(app)
        .delete(`/api/favorites/${new mongoose.Types.ObjectId()}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Favorite not found");
    });

    it("returns 200 when removing an existing favorite", async () => {
      const listRes = await request(app)
        .get("/api/favorites/me")
        .set(authHeader(token));

      const favoriteId = listRes.body[0]._id;

      const res = await request(app)
        .delete(`/api/favorites/${favoriteId}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Removed");
    });
  });
});
