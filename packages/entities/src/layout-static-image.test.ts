import { describe, expect, it } from "vitest";

import {
  parseLayoutStaticImageRef,
  readLayoutStaticImageUrl,
  resolveLayoutStaticUploadFieldName,
  resolveStaticImageSrc,
  serializeLayoutStaticImageRef,
} from "./layout-static-image.js";
import { LAYOUT_STATIC_IMAGE_FIELD_NAME } from "./layout-static-image-field.js";

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

  it("reads downloadUrl from serialized layout static ref", () => {
    const serialized = JSON.stringify({
      storagePath:
        "tenants/rates/entity-files/contract/d2795de8-06af-4ce5-b41e-c4745e011c43.png",
      fileName: "bank.png",
      contentType: "image/png",
      downloadUrl:
        "http://127.0.0.1:9199/v0/b/demo-project-base.appspot.com/o/tenants%2Frates%2Fentity-files%2Fcontract%2Fd2795de8-06af-4ce5-b41e-c4745e011c43.png?alt=media",
    });

    expect(readLayoutStaticImageUrl(serialized)).toBe(
      "http://127.0.0.1:9199/v0/b/demo-project-base.appspot.com/o/tenants%2Frates%2Fentity-files%2Fcontract%2Fd2795de8-06af-4ce5-b41e-c4745e011c43.png?alt=media",
    );
    expect(resolveStaticImageSrc(serialized)).toBe(
      readLayoutStaticImageUrl(serialized),
    );
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
  });
});
