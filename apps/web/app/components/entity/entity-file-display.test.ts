import { describe, expect, it } from "vitest";

import {
  readEntityFileDisplayValue,
  resolveEntityDetailImagePlaceholderSrc,
} from "./entity-file-display.js";

describe("entity-file-display", () => {
  it("reads file display values with optional download urls", () => {
    expect(readEntityFileDisplayValue(null)).toBeNull();
    expect(
      readEntityFileDisplayValue({
        fileName: "statement.pdf",
        downloadUrl: "https://example.com/statement.pdf",
      }),
    ).toEqual({
      fileName: "statement.pdf",
      downloadUrl: "https://example.com/statement.pdf",
    });
  });

  it("exposes the shared detail image placeholder path", () => {
    expect(resolveEntityDetailImagePlaceholderSrc()).toBe(
      "/images/card-image-placeholder.png",
    );
  });
});
