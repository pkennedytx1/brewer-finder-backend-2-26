import request from "supertest";
import jwt from "jsonwebtoken";

export async function createTestUser(app, { name, email, password }) {
  const res = await request(app)
    .post("/api/auth/signup")
    .send({ name, email, password });

  return res;
}

export async function loginTestUser(app, { email, password }) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return res;
}

export function signTestToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
