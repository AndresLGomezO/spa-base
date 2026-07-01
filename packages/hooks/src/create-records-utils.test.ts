import { describe, expect, it } from "vitest";

import {
  extractLiteralInteger,
  resolveMaxCreateRecords,
  validateCreateRecordsLiteralCount,
} from "./create-records-utils.js";
import { HookExecutionError } from "./types.js";

describe("create-records-utils", () => {
  it("extractLiteralInteger returns truncated numbers", () => {
    expect(extractLiteralInteger({ kind: "literal", value: 12.9 })).toBe(12);
    expect(
      extractLiteralInteger({ kind: "field", source: "current", path: "n" }),
    ).toBeNull();
  });

  it("resolveMaxCreateRecords returns tier limits", () => {
    expect(resolveMaxCreateRecords("before")).toBe(1_000);
    expect(resolveMaxCreateRecords("after")).toBe(1_000);
    expect(resolveMaxCreateRecords("after", "deferred")).toBe(1_000);
    expect(resolveMaxCreateRecords("after", "queued")).toBe(5_000);
  });

  it("validateCreateRecordsLiteralCount accepts queued tier literals", () => {
    expect(() =>
      validateCreateRecordsLiteralCount(
        { kind: "literal", value: 2_000 },
        "after",
        "queued",
      ),
    ).not.toThrow();
  });

  it("validateCreateRecordsLiteralCount rejects sync after literals above tier", () => {
    expect(() =>
      validateCreateRecordsLiteralCount(
        { kind: "literal", value: 1_001 },
        "after",
        "sync",
      ),
    ).toThrow(HookExecutionError);
  });

  it("validateCreateRecordsLiteralCount rejects literals above hard ceiling", () => {
    expect(() =>
      validateCreateRecordsLiteralCount(
        { kind: "literal", value: 5_001 },
        "after",
        "queued",
      ),
    ).toThrow(/hard maximum/);
  });
});
