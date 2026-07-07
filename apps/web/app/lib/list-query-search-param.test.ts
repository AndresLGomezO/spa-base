import { describe, expect, it } from "vitest";

import { buildMetricsListQueryState } from "../features/metrics-builder/use-metrics-list-query";
import {
  readListQuerySearch,
  writeListQuerySearch,
} from "./list-query-search-param";

describe("list-query-search-param", () => {
  it("reads search values without trimming", () => {
    const params = new URLSearchParams("q=outflo%20");

    expect(readListQuerySearch(params)).toBe("outflo ");
  });

  it("writes search values without trimming", () => {
    const params = new URLSearchParams();

    writeListQuerySearch(params, "outflo ");

    expect(params.get("q")).toBe("outflo ");
  });

  it("deletes q when search is whitespace-only", () => {
    const params = new URLSearchParams("q=+");

    writeListQuerySearch(params, "   ");

    expect(params.has("q")).toBe(false);
  });

  it("preserves multi-word search in metrics list query state", () => {
    const state = buildMetricsListQueryState(
      new URLSearchParams("q=outflow+category"),
    );

    expect(state.search).toBe("outflow category");
  });
});
