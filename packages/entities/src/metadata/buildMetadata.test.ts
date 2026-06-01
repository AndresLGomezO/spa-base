import { describe, expect, it } from "vitest";

import { normalizeFieldMeta } from "./buildMetadata.js";

describe("normalizeFieldMeta file fields", () => {
  it("passes through maxSizeBytes and defaultImage for image fields", () => {
    const defaultImage = {
      storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
      contentType: "image/png",
      fileName: "logo.png",
    };

    expect(
      normalizeFieldMeta({
        type: "image",
        maxSizeBytes: 2_097_152,
        defaultImage,
      }),
    ).toMatchObject({
      type: "image",
      maxSizeBytes: 2_097_152,
      defaultImage,
    });
  });

  it("passes through maxSizeBytes for document fields", () => {
    expect(
      normalizeFieldMeta({
        type: "document",
        maxSizeBytes: 4_194_304,
      }),
    ).toMatchObject({
      type: "document",
      maxSizeBytes: 4_194_304,
    });
  });
});
