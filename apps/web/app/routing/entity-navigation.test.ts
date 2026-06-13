import { describe, expect, it } from "vitest";

import {
  buildCurrentReturnTo,
  buildEntityListEditPath,
  buildEntityListPath,
  isSafeAppReturnTo,
  readReturnToFromLocation,
  resolveEntityReturnTo,
} from "./entity-navigation.js";

describe("entity-navigation", () => {
  it("builds entity list path", () => {
    expect(buildEntityListPath("contact")).toBe("/app/contact");
  });

  it("builds current returnTo from location", () => {
    expect(
      buildCurrentReturnTo({
        pathname: "/app/contact",
        search: "?q=foo&f.status=Open&page=2",
      }),
    ).toBe("/app/contact?q=foo&f.status=Open&page=2");
  });

  it("validates safe app returnTo paths", () => {
    expect(isSafeAppReturnTo("/app/contact?q=foo")).toBe(true);
    expect(isSafeAppReturnTo("https://evil.example/app/contact")).toBe(false);
    expect(isSafeAppReturnTo("//evil.example/app/contact")).toBe(false);
    expect(isSafeAppReturnTo("/settings/design-layout")).toBe(false);
  });

  it("reads returnTo from location state when safe", () => {
    expect(
      readReturnToFromLocation({
        state: { returnTo: "/app/contact?q=foo" },
      }),
    ).toBe("/app/contact?q=foo");
  });

  it("rejects unsafe returnTo in location state", () => {
    expect(
      readReturnToFromLocation({
        state: { returnTo: "https://evil.example/app/contact" },
      }),
    ).toBeUndefined();
  });

  it("falls back to entity list path when returnTo is missing", () => {
    expect(
      resolveEntityReturnTo(
        { pathname: "/app/contact/abc", search: "", state: null },
        "contact",
      ),
    ).toBe("/app/contact");
  });

  it("merges edit param without dropping list filters", () => {
    expect(
      buildEntityListEditPath(
        "contact",
        "rec-1",
        "/app/contact?q=foo&f.status=Open&page=2",
      ),
    ).toBe("/app/contact?q=foo&f.status=Open&page=2&edit=rec-1");
  });

  it("builds edit path from bare list returnTo", () => {
    expect(buildEntityListEditPath("contact", "rec-1", "/app/contact")).toBe(
      "/app/contact?edit=rec-1",
    );
  });
});
