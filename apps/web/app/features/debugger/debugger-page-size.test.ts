import { describe, expect, it } from "vitest";

import {
  parseDebuggerPageSize,
  writeDebuggerPageSize,
} from "./debugger-page-size";

describe("debugger-page-size", () => {
  it("defaults to 10 when absent or invalid", () => {
    expect(parseDebuggerPageSize(null)).toBe(10);
    expect(parseDebuggerPageSize("7")).toBe(10);
    expect(parseDebuggerPageSize("10")).toBe(10);
    expect(parseDebuggerPageSize("100")).toBe(100);
  });

  it("omits pageSize param for default", () => {
    const params = new URLSearchParams("pageSize=100");
    writeDebuggerPageSize(params, 10);
    expect(params.has("pageSize")).toBe(false);
    writeDebuggerPageSize(params, 50);
    expect(params.get("pageSize")).toBe("50");
  });
});
