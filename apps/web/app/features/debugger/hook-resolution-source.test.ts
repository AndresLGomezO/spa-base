import { describe, expect, it } from "vitest";

import {
  parseHookResolutionSources,
  resolutionSourceForEvent,
} from "./hook-resolution-source";
import type { DebugEvent } from "../../lib/api-client";

describe("parseHookResolutionSources", () => {
  it("parses known sources and drops unknowns", () => {
    expect(parseHookResolutionSources("directMatch,llm,nope")).toEqual([
      "directMatch",
      "llm",
    ]);
  });
});

describe("resolutionSourceForEvent", () => {
  it("reads resolutionSource from summary", () => {
    const event = {
      id: "1",
      source: "hookExecution",
      timestamp: "2026-01-01T00:00:00.000Z",
      title: "Categorize",
      summary: { resolutionSource: "embeddingMatch" },
    } satisfies DebugEvent;

    expect(resolutionSourceForEvent(event)).toBe("embeddingMatch");
  });
});
