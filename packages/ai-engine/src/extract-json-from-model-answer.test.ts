import { describe, expect, it } from "vitest";

import { extractJsonFromModelAnswer } from "./extract-json-from-model-answer.js";

describe("extractJsonFromModelAnswer", () => {
  it("parses raw JSON object", () => {
    const result = extractJsonFromModelAnswer(
      '{"kind":"design-layout-slice","surface":"list"}',
    );
    expect(result).toEqual({ kind: "design-layout-slice", surface: "list" });
  });

  it("parses fenced JSON block", () => {
    const result = extractJsonFromModelAnswer(
      'Here is the layout:\n```json\n{"kind":"design-layout-slice"}\n```',
    );
    expect(result).toEqual({ kind: "design-layout-slice" });
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJsonFromModelAnswer("no json here")).toThrow(
      "No JSON object found",
    );
  });

  it("parses JSON when the closing markdown fence is missing", () => {
    const result = extractJsonFromModelAnswer(
      '```json\n{"kind":"design-layout-slice","surface":"list"}',
    );
    expect(result).toEqual({ kind: "design-layout-slice", surface: "list" });
  });

  it("throws when JSON is truncated before the root object closes", () => {
    expect(() =>
      extractJsonFromModelAnswer('```json\n{"kind":"design-layout-slice"'),
    ).toThrow("truncated");
  });
});
