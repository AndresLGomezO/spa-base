import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  resolveFileFieldMaxSizeBytes,
} from "./file-field-defaults.js";

describe("resolveFileFieldMaxSizeBytes", () => {
  it("returns platform defaults when not configured", () => {
    expect(resolveFileFieldMaxSizeBytes("image")).toBe(
      DEFAULT_IMAGE_MAX_SIZE_BYTES,
    );
    expect(resolveFileFieldMaxSizeBytes("document")).toBe(
      DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
    );
  });

  it("returns configured limits when provided", () => {
    expect(resolveFileFieldMaxSizeBytes("image", 2_097_152)).toBe(2_097_152);
  });
});
