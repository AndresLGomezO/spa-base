import { describe, expect, it } from "vitest";

import {
  extractJsonFromModelAnswer,
  INCOMPLETE_JSON_OBJECT_ERROR,
  isRetriableTruncatedModelAnswerError,
  MAX_OUTPUT_TOKENS_ERROR,
} from "./extract-json-from-model-answer.js";

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
    ).toThrow(INCOMPLETE_JSON_OBJECT_ERROR);
  });

  it("marks truncated JSON and max-token errors as retriable", () => {
    expect(
      isRetriableTruncatedModelAnswerError(
        new Error(INCOMPLETE_JSON_OBJECT_ERROR),
      ),
    ).toBe(true);
    expect(
      isRetriableTruncatedModelAnswerError(new Error(MAX_OUTPUT_TOKENS_ERROR)),
    ).toBe(true);
    expect(
      isRetriableTruncatedModelAnswerError(new Error("No JSON object found")),
    ).toBe(false);
  });

  it("parses the first object when the model appends a second JSON object", () => {
    const result = extractJsonFromModelAnswer(
      '{\n  "action": "useExisting",\n  "categoryId": "abc"\n}\n{\n  "action": "createChild"\n}',
    );
    expect(result).toEqual({ action: "useExisting", categoryId: "abc" });
  });

  it("parses nested objects without stopping at the first closing brace", () => {
    const result = extractJsonFromModelAnswer(
      '{"results":[{"action":"useExisting","meta":{"ok":true}}]} trailing prose',
    );
    expect(result).toEqual({
      results: [{ action: "useExisting", meta: { ok: true } }],
    });
  });
});
