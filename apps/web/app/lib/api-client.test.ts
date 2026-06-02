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
  fetchMetricBatch,
  fetchMetricRow,
  fetchMetricRowOrNull,
  getMetricDefinition,
  isMetricRowNotFoundError,
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
        data: { items: [], nextCursor: null, totalCount: 0 },
        error: null,
      }),
    });

    const result = await listEntity("widget");

    expect(result).toEqual({ items: [], nextCursor: null, totalCount: 0 });
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
        data: { items: [], nextCursor: "abc", totalCount: 1 },
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

describe("metric read api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("fetches a metric definition by id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: "def_1", name: "Test metric" },
        error: null,
      }),
    });

    const result = await getMetricDefinition("def_1");

    expect(result).toEqual({ id: "def_1", name: "Test metric" });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/metric-definitions/def_1", "http://127.0.0.1:3000"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("posts a metric row query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          values: { sum_amount: 100 },
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        error: null,
      }),
    });

    const result = await fetchMetricRow("def_1", {
      group: { month: "2026-06" },
      dimensions: { categoryId: "food" },
    });

    expect(result.values.sum_amount).toBe(100);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/metrics/def_1/row", "http://127.0.0.1:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          group: { month: "2026-06" },
          dimensions: { categoryId: "food" },
        }),
      }),
    );
  });

  it("posts a metric batch query", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          items: [
            {
              values: { sum_amount: 1 },
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
            null,
          ],
        },
        error: null,
      }),
    });

    const result = await fetchMetricBatch("def_1", [
      { group: {}, dimensions: {} },
      { group: { month: "2026-05" }, dimensions: {} },
    ]);

    expect(result).toHaveLength(2);
    expect(result[1]).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/metrics/def_1/batch", "http://127.0.0.1:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns null from fetchMetricRowOrNull when row is missing", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        data: null,
        error: {
          code: "METRIC_ROW_NOT_FOUND",
          message: "Metric row not found.",
        },
      }),
    });

    const result = await fetchMetricRowOrNull("def_1", {
      group: {},
      dimensions: {},
    });

    expect(result).toBeNull();
  });

  it("identifies metric row not found errors", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        data: null,
        error: {
          code: "METRIC_ROW_NOT_FOUND",
          message: "Metric row not found.",
        },
      }),
    });

    await expect(
      fetchMetricRow("def_1", { group: {}, dimensions: {} }),
    ).rejects.toSatisfy((error: unknown) => isMetricRowNotFoundError(error));
  });
});
