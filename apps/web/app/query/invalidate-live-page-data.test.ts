import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { invalidateLivePageData } from "./invalidate-live-page-data.js";

describe("invalidateLivePageData", () => {
  it("invalidates entity, metric, query viewer, and O2M subfield queries", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateLivePageData(queryClient);

    expect(invalidateQueries).toHaveBeenCalledTimes(4);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["entity"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["metric-row"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["entity-query-results"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["one-to-many-subfield"],
    });
  });
});
