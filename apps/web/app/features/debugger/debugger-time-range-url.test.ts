import { describe, expect, it } from "vitest";

import {
  debuggerTimeSelectionKey,
  parseDebuggerTimeSelection,
  parseDebuggerTimeZone,
  writeDebuggerTimeSelection,
  writeDebuggerTimeZone,
} from "./debugger-time-range-url";

describe("debugger-time-range-url", () => {
  it("defaults to last 5 minutes when time is absent", () => {
    expect(parseDebuggerTimeSelection(new URLSearchParams())).toEqual({
      mode: "preset",
      preset: "5m",
    });
  });

  it("round-trips preset, custom, and around selections", () => {
    const cases = [
      { mode: "preset" as const, preset: "1h" as const },
      {
        mode: "custom" as const,
        fromIso: "2026-07-23T10:00:00.000Z",
        toIso: "2026-07-23T12:00:00.000Z",
      },
      {
        mode: "around" as const,
        atIso: "2026-07-23T12:00:00.000Z",
        window: "5m" as const,
      },
    ];

    for (const selection of cases) {
      const params = new URLSearchParams();
      writeDebuggerTimeSelection(params, selection);
      expect(parseDebuggerTimeSelection(params)).toEqual(selection);
    }
  });

  it("omits time param for default 5m", () => {
    const params = new URLSearchParams("time=1h");
    writeDebuggerTimeSelection(params, { mode: "preset", preset: "5m" });
    expect(params.has("time")).toBe(false);
  });

  it("writes and parses timezone only when non-default", () => {
    const params = new URLSearchParams();
    writeDebuggerTimeZone(params, "America/Bogota", "UTC");
    expect(params.get("tz")).toBe("America/Bogota");
    expect(parseDebuggerTimeZone(params, "UTC")).toBe("America/Bogota");

    writeDebuggerTimeZone(params, "UTC", "UTC");
    expect(params.has("tz")).toBe(false);
    expect(parseDebuggerTimeZone(params, "UTC")).toBe("UTC");
  });

  it("builds stable selection keys", () => {
    expect(debuggerTimeSelectionKey({ mode: "preset", preset: "5m" })).toBe(
      "preset:5m",
    );
    expect(
      debuggerTimeSelectionKey({
        mode: "custom",
        fromIso: "a",
        toIso: "b",
      }),
    ).toBe("custom:a:b");
  });
});
