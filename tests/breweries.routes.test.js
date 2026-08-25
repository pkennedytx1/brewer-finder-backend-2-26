import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";

const mockBrewery = {
  id: "b58f8e",
  name: "Test Brewery",
  city: "Austin",
  state: "Texas",
};

describe("GET /api/breweries", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockBrewery],
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when no search filters are provided", async () => {
    const res = await request(app).get("/api/breweries");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "At least one of by_city, by_name, by_state, or by_type is required"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns breweries when a valid filter is provided", async () => {
    const res = await request(app).get("/api/breweries?by_city=austin");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([mockBrewery]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openbrewerydb.org/v1/breweries?by_city=austin"
    );
  });
});

describe("GET /api/breweries/:id", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a brewery when found", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockBrewery,
    });

    const res = await request(app).get("/api/breweries/b58f8e");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockBrewery);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openbrewerydb.org/v1/breweries/b58f8e"
    );
  });

  it("returns 404 when brewery is not found", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const res = await request(app).get("/api/breweries/missing-id");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Brewery not found");
  });
});
