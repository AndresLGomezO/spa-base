import { describe, expect, it } from "vitest";

import { LAYOUT_STATIC_IMAGE_FIELD_NAME } from "@repo/entities";

import {
  parseLayoutStaticImageRef,
  readLayoutStaticImageUrl,
  resolveLayoutStaticUploadFieldName,
  serializeLayoutStaticImageRef,
} from "./layout-static-image";

describe("layout-static-image", () => {
  it("round-trips file reference JSON", () => {
    const ref = {
      storagePath: "tenants/t1/entity-files/account/abc.jpg",
      fileName: "logo.png",
      contentType: "image/png",
    };
    const serialized = serializeLayoutStaticImageRef(ref);
    expect(parseLayoutStaticImageRef(serialized)).toEqual(ref);
  });

  it("reads https URLs directly", () => {
    expect(readLayoutStaticImageUrl("https://cdn.example/logo.png")).toBe(
      "https://cdn.example/logo.png",
    );
  });

  it("uses reserved field when entity has no image field", () => {
    expect(
      resolveLayoutStaticUploadFieldName({
        name: { type: "string" },
      }),
    ).toBe(LAYOUT_STATIC_IMAGE_FIELD_NAME);
    expect(
      resolveLayoutStaticUploadFieldName({
        logo: { type: "image" },
        name: { type: "string" },
      }),
    ).toBe("logo");
  });
});
