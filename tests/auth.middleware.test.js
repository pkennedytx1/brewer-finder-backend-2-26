import "dotenv/config";
import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";

function mockReqRes(authHeader) {
  const req = { headers: {} };
  if (authHeader !== undefined) {
    req.headers.authorization = authHeader;
  }

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();

  return { req, res, next };
}

describe("protect middleware", () => {
  it("returns 401 when no authorization header", () => {
    const { req, res, next } = mockReqRes();

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, no token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is not Bearer format", () => {
    const { req, res, next } = mockReqRes("Basic abc123");

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, no token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    const { req, res, next } = mockReqRes("Bearer not.a.valid.token");

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, token failed",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and sets req.user when token is valid", () => {
    const userId = "507f1f77bcf86cd799439011";
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const { req, res, next } = mockReqRes(`Bearer ${token}`);

    protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: userId });
    expect(res.status).not.toHaveBeenCalled();
  });
});
