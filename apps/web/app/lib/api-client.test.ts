import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/app-config", () => ({
  appConfig: {
    apiBaseUrl: "http://127.0.0.1:3000",
  },
}));

vi.mock("./app-check", () => ({
  getAppCheckHeaderValue: vi.fn(async () => "emulator"),
}));

vi.mock("./firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn(async () => "id-token"),
    },
  },
}));

import {
  apiRequest,
  createEntity,
  listEntity,
  mapFieldErrors,
} from "./api-client";

describe("mapFieldErrors", () => {
  it("maps array messages to field keys", () => {
    expect(
      mapFieldErrors({
        name: ["Name is required."],
        email: ["Invalid email."],
      }),
    ).toEqual({
      name: "Name is required.",
      email: "Invalid email.",
    });
  });

  it("returns empty object for invalid details", () => {
    expect(mapFieldErrors(null)).toEqual({});
  });
});

describe("apiRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends auth headers and parses success envelope", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { items: [], nextCursor: null },
        error: null,
      }),
    });

    const result = await listEntity("widget");

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/widget", "http://127.0.0.1:3000"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer id-token",
          "X-Firebase-AppCheck": "emulator",
        }),
      }),
    );
  });

  it("throws ApiClientError with field errors", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed.",
          details: { name: ["Name is required."] },
        },
      }),
    });

    await expect(
      createEntity("widget", { email: "invalid@example.com" }),
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      fieldErrors: { name: "Name is required." },
    });
  });

  it("supports query parameters", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { items: [], nextCursor: "abc" },
        error: null,
      }),
    });

    await apiRequest("/api/widget", {
      query: { limit: 10, cursor: "abc" },
    });

    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toBe(
      "http://127.0.0.1:3000/api/widget?limit=10&cursor=abc",
    );
  });
});
