import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES,
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

  it("reserves enough JSON body budget for base64 image uploads", () => {
    expect(MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES).toBeGreaterThan(
      DEFAULT_IMAGE_MAX_SIZE_BYTES,
    );
  });
});
