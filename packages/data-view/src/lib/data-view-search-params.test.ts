import { describe, expect, it } from "vitest";

import {
  applyDataViewStateToSearchParams,
  clearDataViewParamsFromSearchParams,
  dataViewStateFromSearchParams,
  FILTER_PARAM_PREFIX,
} from "./data-view-search-params";

const columnIdSets = {
  filterableColumnIds: new Set(["status", "name"]),
  sortableColumnIds: new Set(["status", "name"]),
};

const allColumnIds = ["status", "name"];

describe("dataViewStateFromSearchParams", () => {
  it("returns defaults for empty params", () => {
    expect(
      dataViewStateFromSearchParams(new URLSearchParams(), columnIdSets),
    ).toEqual({
      search: "",
      filters: {},
      sort: { columnId: null, direction: "asc" },
      page: 1,
    });
  });

  it("parses search, filters, sort, and page", () => {
    const params = new URLSearchParams({
      q: "jane",
      sort: "status",
      dir: "desc",
      page: "2",
    });
    params.append(`${FILTER_PARAM_PREFIX}status`, "Open");
    params.append(`${FILTER_PARAM_PREFIX}status`, "Closed");

    expect(dataViewStateFromSearchParams(params, columnIdSets)).toEqual({
      search: "jane",
      filters: { status: ["Open", "Closed"] },
      sort: { columnId: "status", direction: "desc" },
      page: 2,
    });
  });

  it("ignores invalid sort and filter columns", () => {
    const params = new URLSearchParams({
      sort: "unknown",
      [`${FILTER_PARAM_PREFIX}unknown`]: "x",
    });

    expect(dataViewStateFromSearchParams(params, columnIdSets)).toEqual({
      search: "",
      filters: {},
      sort: { columnId: null, direction: "asc" },
      page: 1,
    });
  });
});

describe("applyDataViewStateToSearchParams", () => {
  it("merges patches and omits page when set to 1", () => {
    const next = applyDataViewStateToSearchParams(
      new URLSearchParams("create=&edit=abc"),
      {
        search: "jane",
        filters: { status: ["Open"] },
        sort: { columnId: "name", direction: "asc" },
        page: 1,
      },
      allColumnIds,
    );

    expect(next.get("create")).toBe("");
    expect(next.get("edit")).toBe("abc");
    expect(next.get("q")).toBe("jane");
    expect(next.get("sort")).toBe("name");
    expect(next.get("dir")).toBe("asc");
    expect(next.get("page")).toBeNull();
    expect(next.getAll(`${FILTER_PARAM_PREFIX}status`)).toEqual(["Open"]);
  });

  it("clears search and sort when patched to empty", () => {
    const prev = new URLSearchParams("q=test&sort=status&dir=desc&page=3");
    const next = applyDataViewStateToSearchParams(
      prev,
      {
        search: "",
        sort: { columnId: null, direction: "asc" },
        page: 1,
      },
      allColumnIds,
    );

    expect(next.get("q")).toBeNull();
    expect(next.get("sort")).toBeNull();
    expect(next.get("dir")).toBeNull();
    expect(next.get("page")).toBeNull();
  });
});

describe("clearDataViewParamsFromSearchParams", () => {
  it("removes data view params but preserves create and edit", () => {
    const prev = new URLSearchParams(
      "create=&edit=abc&q=test&sort=status&dir=desc&page=2&f.status=Open",
    );
    const next = clearDataViewParamsFromSearchParams(prev, allColumnIds);

    expect(next.get("create")).toBe("");
    expect(next.get("edit")).toBe("abc");
    expect(next.get("q")).toBeNull();
    expect(next.get("sort")).toBeNull();
    expect(next.get("page")).toBeNull();
    expect(next.get(`${FILTER_PARAM_PREFIX}status`)).toBeNull();
  });
});
