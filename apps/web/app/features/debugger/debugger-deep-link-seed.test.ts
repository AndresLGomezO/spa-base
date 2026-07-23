import { afterEach, describe, expect, it, vi } from "vitest";

import type { DebugEvent } from "../../lib/api-client";
import {
  clearDebuggerDeepLinkSeed,
  readDebuggerDeepLinkSeed,
  seedDebuggerDeepLinkEvent,
} from "./debugger-deep-link-seed";

const sampleEvent: DebugEvent = {
  id: "hookexec_abc",
  source: "hookExecution",
  timestamp: "2026-07-23T12:00:00.000Z",
  title: "Test hook",
  summary: { entityName: "financialItem", recordId: "rec_1" },
};

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("debugger-deep-link-seed", () => {
  it("round-trips an event via localStorage", () => {
    const key = seedDebuggerDeepLinkEvent(sampleEvent);
    expect(key).toBe("hookExecution:hookexec_abc");
    expect(readDebuggerDeepLinkSeed(key)).toEqual(sampleEvent);
  });

  it("expires after TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T12:00:00.000Z"));
    const key = seedDebuggerDeepLinkEvent(sampleEvent);
    vi.setSystemTime(new Date("2026-07-23T12:06:00.000Z"));
    expect(readDebuggerDeepLinkSeed(key)).toBeNull();
  });

  it("clears a seed on demand", () => {
    const key = seedDebuggerDeepLinkEvent(sampleEvent);
    clearDebuggerDeepLinkSeed(key);
    expect(readDebuggerDeepLinkSeed(key)).toBeNull();
  });
});
