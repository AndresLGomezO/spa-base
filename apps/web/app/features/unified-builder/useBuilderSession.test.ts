import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBuilderSession } from "./useBuilderSession";

describe("useBuilderSession", () => {
  it("tracks dirty state against saved baseline", () => {
    let value = 1;
    const { result, rerender } = renderHook(() =>
      useBuilderSession({
        readCurrentSnapshot: () => value,
        areSnapshotsEqual: (left, right) => left === right,
        initialBaseline: 1,
      }),
    );

    expect(result.current.isDirty).toBe(false);

    value = 2;
    rerender();

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.syncSavedBaseline();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("tracks properties panel open state and panel dirty snapshots", () => {
    let value = "a";
    const { result, rerender } = renderHook(() =>
      useBuilderSession({
        readCurrentSnapshot: () => value,
        areSnapshotsEqual: (left, right) => left === right,
        initialBaseline: "a",
      }),
    );

    act(() => {
      result.current.openPropertiesPanel("Row");
    });

    expect(result.current.propertiesPanelOpen).toBe(true);
    expect(result.current.propertiesPanelIsDirty).toBe(false);

    value = "b";
    rerender();

    expect(result.current.propertiesPanelIsDirty).toBe(true);

    act(() => {
      result.current.commitPropertiesPanelBaseline();
    });

    expect(result.current.propertiesPanelIsDirty).toBe(false);

    act(() => {
      result.current.closePropertiesPanel();
    });

    expect(result.current.propertiesPanelOpen).toBe(false);
  });
});
