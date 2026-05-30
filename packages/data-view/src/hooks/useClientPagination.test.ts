import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useClientPagination } from "./useClientPagination";

describe("useClientPagination", () => {
  it("slices items by page", () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() =>
      useClientPagination(items, { pageSize: 20 }),
    );

    expect(result.current.pageItems).toHaveLength(20);
    expect(result.current.totalCount).toBe(25);

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });
});
