import { describe, expect, it } from "vitest";

import { entityQueryResultsQueryKey } from "../../query/query-client.js";

describe("entityQueryResultsQueryKey", () => {
  it("builds a stable query key per entity query definition id", () => {
    expect(entityQueryResultsQueryKey("query-def-1")).toEqual([
      "entity-query-results",
      "query-def-1",
      null,
    ]);
  });
});
