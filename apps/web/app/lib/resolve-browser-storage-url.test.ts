import { describe, expect, it } from "vitest";

import { resolveBrowserStorageUrl } from "./resolve-browser-storage-url";

describe("resolveBrowserStorageUrl", () => {
  it("rewrites docker-internal storage emulator hostnames", () => {
    const url =
      "http://firebase-emulator:9199/v0/b/demo-project-base.appspot.com/o/tenants%2Ft1%2Fai-ui-renders%2Fjob.png?alt=media";
    expect(resolveBrowserStorageUrl(url)).toBe(
      "http://127.0.0.1:9199/v0/b/demo-project-base.appspot.com/o/tenants%2Ft1%2Fai-ui-renders%2Fjob.png?alt=media",
    );
  });

  it("leaves production firebase storage URLs unchanged", () => {
    const url =
      "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/path?alt=media&token=abc";
    expect(resolveBrowserStorageUrl(url)).toBe(url);
  });

  it("returns undefined for empty input", () => {
    expect(resolveBrowserStorageUrl(undefined)).toBeUndefined();
    expect(resolveBrowserStorageUrl("")).toBeUndefined();
  });
});
