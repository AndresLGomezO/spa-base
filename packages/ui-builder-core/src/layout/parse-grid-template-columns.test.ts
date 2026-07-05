import { describe, expect, it } from "vitest";

import {
  analyzeGridTemplateColumns,
  normalizeGridTemplateColumnsForCss,
} from "./parse-grid-template-columns.js";

describe("analyzeGridTemplateColumns", () => {
  it("groups repeated fixed tracks in preview", () => {
    const result = analyzeGridTemplateColumns("repeat(3, 200px)", {
      expectedTrackCount: 3,
    });

    expect(result).toMatchObject({
      ok: true,
      preview: "200px ×3",
      tracks: ["200px", "200px", "200px"],
      hasFlexibleTracks: false,
    });
  });

  it("formats minmax ranges and groups repeated tracks", () => {
    const result = analyzeGridTemplateColumns(
      "minmax(500px, 600px) repeat(3, 200px)",
      { expectedTrackCount: 4 },
    );

    expect(result).toMatchObject({
      ok: true,
      preview: "500px–600px · 200px ×3",
      hasFlexibleTracks: true,
    });
  });

  it("formats flexible tracks without resolving them to pixels", () => {
    const result = analyzeGridTemplateColumns("1fr minmax(0, 2fr)", {
      expectedTrackCount: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      preview: "1fr · 0–2fr",
      hasFlexibleTracks: true,
    });
  });

  it("expands nested repeat()", () => {
    const result = analyzeGridTemplateColumns("repeat(2, repeat(2, 1fr))", {
      expectedTrackCount: 4,
    });

    expect(result).toMatchObject({
      ok: true,
      preview: "1fr ×4",
      hasFlexibleTracks: true,
    });
  });

  it("flags empty values", () => {
    expect(analyzeGridTemplateColumns("   ")).toMatchObject({
      ok: false,
      errorCode: "empty",
    });
  });

  it("flags unbalanced parentheses", () => {
    expect(analyzeGridTemplateColumns("minmax(0, 1fr")).toMatchObject({
      ok: false,
      errorCode: "unbalanced_delimiters",
    });
  });

  it("flags invalid repeat syntax", () => {
    expect(analyzeGridTemplateColumns("repeat(0, 1fr)")).toMatchObject({
      ok: false,
      errorCode: "invalid_repeat",
    });
  });

  it("flags invalid track sizes", () => {
    expect(analyzeGridTemplateColumns("not-a-size")).toMatchObject({
      ok: false,
      errorCode: "invalid_track",
    });
  });

  it("accepts single-argument minmax() as a fixed-size shorthand", () => {
    expect(
      analyzeGridTemplateColumns(
        "minmax(500px, 600px) repeat(3, minmax(200px))",
        { expectedTrackCount: 4 },
      ),
    ).toMatchObject({
      ok: true,
      preview: "500px–600px · 200px ×3",
      hasFlexibleTracks: true,
    });
  });

  it("normalizes single-argument minmax() for CSS output", () => {
    expect(
      normalizeGridTemplateColumnsForCss(
        "minmax(500px, 600px) repeat(3, minmax(200px))",
      ),
    ).toBe("minmax(500px, 600px) 200px 200px 200px");
  });

  it("flags track count mismatches against layout columns", () => {
    expect(
      analyzeGridTemplateColumns("repeat(3, 200px)", {
        expectedTrackCount: 4,
      }),
    ).toMatchObject({
      ok: false,
      errorCode: "track_count_mismatch",
      preview: "200px ×3",
    });
  });

  it("skips track count validation for auto-fill and auto-fit", () => {
    expect(
      analyzeGridTemplateColumns("repeat(auto-fill, minmax(200px, 1fr))", {
        expectedTrackCount: 4,
      }),
    ).toMatchObject({
      ok: true,
      hasDynamicRepeat: true,
      hasFlexibleTracks: true,
      preview: "repeat(auto-fill, minmax(200px, 1fr))",
    });
  });

  it("ignores line-name tokens in preview", () => {
    expect(
      analyzeGridTemplateColumns("[sidebar] 240px [main] 1fr", {
        expectedTrackCount: 2,
      }),
    ).toMatchObject({
      ok: true,
      preview: "240px · 1fr",
    });
  });
});
