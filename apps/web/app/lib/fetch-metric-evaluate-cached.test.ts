import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-client.js", () => ({
  fetchMetricEvaluateOrNull: vi.fn(),
}));

import { fetchMetricEvaluateOrNull } from "./api-client.js";

const fetchMetricEvaluateOrNullMock = vi.mocked(fetchMetricEvaluateOrNull);

describe("fetchMetricEvaluateCached", () => {
  beforeEach(async () => {
    fetchMetricEvaluateOrNullMock.mockReset();
    fetchMetricEvaluateOrNullMock.mockResolvedValue({
      values: { primary: 42 },
      updatedAt: "2026-07-05T00:00:00.000Z",
    });

    const { queryClient } = await import("../query/query-client.js");
    queryClient.clear();
  });

  it("deduplicates concurrent evaluate requests with the same parameters", async () => {
    const { fetchMetricEvaluateCached } =
      await import("./fetch-metric-evaluate-cached.js");

    const parameters = { period: "2026-07" };
    const [first, second] = await Promise.all([
      fetchMetricEvaluateCached("metric_1", parameters),
      fetchMetricEvaluateCached("metric_1", parameters),
    ]);

    expect(first).toEqual({
      values: { primary: 42 },
      updatedAt: "2026-07-05T00:00:00.000Z",
    });
    expect(second).toEqual({
      values: { primary: 42 },
      updatedAt: "2026-07-05T00:00:00.000Z",
    });
    expect(fetchMetricEvaluateOrNullMock).toHaveBeenCalledTimes(1);
    expect(fetchMetricEvaluateOrNullMock).toHaveBeenCalledWith(
      "metric_1",
      parameters,
    );
  });
});
