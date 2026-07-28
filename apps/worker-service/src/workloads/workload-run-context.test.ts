import { describe, expect, it } from "vitest";

import { readWorkloadRunLineageFromHeaders } from "./workload-run-context.js";

describe("readWorkloadRunLineageFromHeaders", () => {
  it("returns empty object when headers are undefined", () => {
    expect(readWorkloadRunLineageFromHeaders(undefined)).toEqual({});
  });

  it("returns empty object when headers are empty", () => {
    expect(readWorkloadRunLineageFromHeaders({})).toEqual({});
  });

  it("reads parent and root from exact header names", () => {
    const result = readWorkloadRunLineageFromHeaders({
      "X-Workload-Run-Parent-Id": "parent-123",
      "X-Workload-Run-Root-Id": "root-456",
    });
    expect(result).toEqual({
      parentRunId: "parent-123",
      rootRunId: "root-456",
    });
  });

  it("reads headers case-insensitively", () => {
    const result = readWorkloadRunLineageFromHeaders({
      "x-workload-run-parent-id": "parent-abc",
      "x-workload-run-root-id": "root-def",
    });
    expect(result).toEqual({
      parentRunId: "parent-abc",
      rootRunId: "root-def",
    });
  });

  it("handles array values (picks first)", () => {
    const result = readWorkloadRunLineageFromHeaders({
      "X-Workload-Run-Parent-Id": ["first", "second"],
      "X-Workload-Run-Root-Id": ["only-root"],
    });
    expect(result).toEqual({
      parentRunId: "first",
      rootRunId: "only-root",
    });
  });

  it("omits undefined values from result", () => {
    const result = readWorkloadRunLineageFromHeaders({
      "X-Workload-Run-Parent-Id": "only-parent",
    });
    expect(result).toEqual({ parentRunId: "only-parent" });
    expect("rootRunId" in result).toBe(false);
  });
});
