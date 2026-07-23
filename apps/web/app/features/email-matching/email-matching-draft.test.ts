import { describe, expect, it } from "vitest";

import {
  emptyExtractorRow,
  extractorsToPayload,
  inferExtractorSourceMode,
  splitLines,
} from "./email-matching-draft";

describe("splitLines", () => {
  it("splits plain comma and newline lists", () => {
    expect(splitLines("a@bank.com, b@bank.com\nc@bank.com")).toEqual([
      "a@bank.com",
      "b@bank.com",
      "c@bank.com",
    ]);
  });

  it("keeps commas inside /regex/flags patterns", () => {
    expect(
      splitLines("/producto\\s*2518|cuenta\\s+\\*{1,2}2518/i"),
    ).toEqual(["/producto\\s*2518|cuenta\\s+\\*{1,2}2518/i"]);
  });

  it("still splits multiple patterns when one is a regex with commas", () => {
    expect(
      splitLines(
        "Purchase approved\n/producto\\s*2518|cuenta\\s+\\*{1,2}2518/i, plain text",
      ),
    ).toEqual([
      "Purchase approved",
      "/producto\\s*2518|cuenta\\s+\\*{1,2}2518/i",
      "plain text",
    ]);
  });
});

describe("extractor source mode", () => {
  it("infers pattern mode when a pattern is present", () => {
    expect(inferExtractorSourceMode({ pattern: "/(\\d+)/" })).toBe("pattern");
    expect(inferExtractorSourceMode({ pattern: "  " })).toBe("label");
    expect(inferExtractorSourceMode({})).toBe("label");
  });

  it("serializes only label fields in label mode", () => {
    const payload = extractorsToPayload([
      {
        ...emptyExtractorRow(),
        field: "amount",
        sourceMode: "label",
        label: "Valor",
        pattern: "/ignored/",
        captureGroup: "2",
      },
    ]);
    expect(payload).toEqual([
      {
        field: "amount",
        label: "Valor",
        transform: "trim",
      },
    ]);
  });

  it("serializes only pattern fields in pattern mode", () => {
    const payload = extractorsToPayload([
      {
        ...emptyExtractorRow(),
        field: "amount",
        sourceMode: "pattern",
        label: "Ignored",
        pattern: "/(\\d+)/",
        captureGroup: "1",
      },
    ]);
    expect(payload).toEqual([
      {
        field: "amount",
        label: "",
        pattern: "/(\\d+)/",
        captureGroup: 1,
        transform: "trim",
      },
    ]);
  });
});
