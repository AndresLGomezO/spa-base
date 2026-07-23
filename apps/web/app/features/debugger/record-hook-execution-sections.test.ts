import { describe, expect, it } from "vitest";

import type { DebugEvent } from "../../lib/api-client";
import {
  partitionRecordHookExecutions,
  recordHookRelatedSourceLabel,
  splitFilteredRecordHookExecutions,
} from "./record-hook-execution-sections";

function event(
  id: string,
  summary?: DebugEvent["summary"],
  subtitle?: string,
): DebugEvent {
  return {
    id,
    source: "hookExecution",
    timestamp: "2026-07-23T12:00:00.000Z",
    title: `Hook ${id}`,
    ...(subtitle ? { subtitle } : {}),
    status: "success",
    summary: summary ?? {},
  };
}

describe("partitionRecordHookExecutions", () => {
  it("keeps direct events and drops related duplicates", () => {
    const direct = [event("a"), event("b")];
    const related = [event("b"), event("c")];

    expect(partitionRecordHookExecutions(direct, related)).toEqual({
      direct,
      related: [event("c")],
    });
  });
});

describe("splitFilteredRecordHookExecutions", () => {
  it("splits a filtered list back into direct and related sections", () => {
    const sections = partitionRecordHookExecutions(
      [event("a"), event("b")],
      [event("c"), event("d")],
    );
    const filtered = [event("b"), event("d"), event("a")];

    expect(splitFilteredRecordHookExecutions(filtered, sections)).toEqual({
      direct: [event("b"), event("a")],
      related: [event("d")],
    });
  });
});

describe("recordHookRelatedSourceLabel", () => {
  it("formats entity and afterEmail-style event label", () => {
    expect(
      recordHookRelatedSourceLabel(
        event("a", {
          entityName: "financialItem",
          phase: "after",
          operation: "email",
        }),
      ),
    ).toBe("financialItem · afterEmail");
  });

  it("falls back to entity and subtitle", () => {
    expect(
      recordHookRelatedSourceLabel(
        event("a", { entityName: "financialItem" }, "card purchase"),
      ),
    ).toBe("financialItem · card purchase");
  });
});
