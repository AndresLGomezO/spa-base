import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import type { DataViewColumnDescriptor } from "../components/data-view/types";
import { useDataViewUrlState } from "./useDataViewUrlState";

interface SampleRow {
  readonly id: string;
  readonly name: string;
}

const columns: readonly DataViewColumnDescriptor<SampleRow>[] = [
  {
    id: "name",
    label: "Name",
    getValue: (row) => row.name,
  },
];

function createWrapper(initialEntry = "/") {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  };
}

describe("useDataViewUrlState", () => {
  it("reads initial state from the URL", () => {
    const { result } = renderHook(() => useDataViewUrlState(columns), {
      wrapper: createWrapper("/?q=jane&sort=name&dir=desc&page=2"),
    });

    expect(result.current.search).toBe("jane");
    expect(result.current.sort).toEqual({
      columnId: "name",
      direction: "desc",
    });
    expect(result.current.page).toBe(2);
  });

  it("updates search in the URL", () => {
    const { result } = renderHook(() => useDataViewUrlState(columns), {
      wrapper: createWrapper("/"),
    });

    act(() => {
      result.current.setSearch("alpha");
    });

    expect(result.current.search).toBe("alpha");
  });

  it("clears data view params while preserving create and edit", () => {
    const { result } = renderHook(() => useDataViewUrlState(columns), {
      wrapper: createWrapper("/?create=&edit=abc&q=test&sort=name"),
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.search).toBe("");
    expect(result.current.sort.columnId).toBeNull();
  });
});
