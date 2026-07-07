import { describe, expect, it } from "vitest";

import {
  applyEntityQuerySelectionToSearchParams,
  ENTITY_QUERY_SELECTION_SEARCH_PARAM,
  getEntityQuerySelectionId,
} from "./use-entity-query-builder-editor";

describe("entity query selection URL helpers", () => {
  it("reads selected query id from search params", () => {
    const params = new URLSearchParams({
      [ENTITY_QUERY_SELECTION_SEARCH_PARAM]: "entity_query_2",
    });
    expect(getEntityQuerySelectionId(params)).toBe("entity_query_2");
  });

  it("writes and clears selected query id in search params", () => {
    const params = new URLSearchParams({ q: "payments" });
    const withSelection = applyEntityQuerySelectionToSearchParams(
      params,
      "entity_query_2",
    );
    expect(withSelection.get(ENTITY_QUERY_SELECTION_SEARCH_PARAM)).toBe(
      "entity_query_2",
    );
    expect(withSelection.get("q")).toBe("payments");

    const cleared = applyEntityQuerySelectionToSearchParams(withSelection, "");
    expect(cleared.get(ENTITY_QUERY_SELECTION_SEARCH_PARAM)).toBeNull();
    expect(cleared.get("q")).toBe("payments");
  });
});
