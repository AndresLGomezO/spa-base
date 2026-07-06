import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-client", () => ({
  listEntity: vi.fn(),
}));

import { listEntity } from "./api-client";
import {
  ENTITY_LIST_MAX_LIMIT,
  fetchAllEntityItems,
  RELATION_FILTER_OPTIONS_MAX_ITEMS,
} from "./fetch-all-entity-items";

const listEntityMock = vi.mocked(listEntity);

describe("fetchAllEntityItems", () => {
  beforeEach(() => {
    listEntityMock.mockReset();
  });

  it("fetches a single page when nextCursor is null", async () => {
    listEntityMock.mockResolvedValueOnce({
      items: [{ id: "a" }, { id: "b" }],
      nextCursor: null,
      totalCount: 2,
    });

    const items = await fetchAllEntityItems<{ id: string }>("frequency");

    expect(items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(listEntityMock).toHaveBeenCalledTimes(1);
    expect(listEntityMock).toHaveBeenCalledWith("frequency", {
      limit: ENTITY_LIST_MAX_LIMIT,
      cursor: undefined,
    });
  });

  it("follows cursors until exhausted", async () => {
    listEntityMock
      .mockResolvedValueOnce({
        items: [{ id: "1" }],
        nextCursor: "cursor-1",
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        items: [{ id: "2" }],
        nextCursor: null,
        totalCount: 2,
      });

    const items = await fetchAllEntityItems<{ id: string }>("frequency");

    expect(items).toEqual([{ id: "1" }, { id: "2" }]);
    expect(listEntityMock).toHaveBeenCalledTimes(2);
    expect(listEntityMock).toHaveBeenNthCalledWith(2, "frequency", {
      limit: ENTITY_LIST_MAX_LIMIT,
      cursor: "cursor-1",
    });
  });

  it("stops at maxItems cap", async () => {
    listEntityMock.mockResolvedValue({
      items: [{ id: "x" }],
      nextCursor: "more",
      totalCount: 1000,
    });

    const items = await fetchAllEntityItems<{ id: string }>("frequency", {
      maxItems: 2,
    });

    expect(items).toHaveLength(2);
    expect(listEntityMock).toHaveBeenCalledTimes(2);
  });

  it("never requests a page size above ENTITY_LIST_MAX_LIMIT", async () => {
    listEntityMock.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      totalCount: 0,
    });

    await fetchAllEntityItems("frequency", { pageSize: 500 });

    expect(listEntityMock).toHaveBeenCalledWith("frequency", {
      limit: ENTITY_LIST_MAX_LIMIT,
      cursor: undefined,
    });
  });

  it("exports RELATION_FILTER_OPTIONS_MAX_ITEMS for preload cap", () => {
    expect(RELATION_FILTER_OPTIONS_MAX_ITEMS).toBe(500);
  });

  it("deduplicates concurrent fetches with the same arguments", async () => {
    listEntityMock
      .mockResolvedValueOnce({
        items: [{ id: "1" }],
        nextCursor: "cursor-1",
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        items: [{ id: "2" }],
        nextCursor: null,
        totalCount: 2,
      });

    const [first, second] = await Promise.all([
      fetchAllEntityItems<{ id: string }>("frequency"),
      fetchAllEntityItems<{ id: string }>("frequency"),
    ]);

    expect(first).toEqual([{ id: "1" }, { id: "2" }]);
    expect(second).toEqual([{ id: "1" }, { id: "2" }]);
    expect(listEntityMock).toHaveBeenCalledTimes(2);
  });
});
