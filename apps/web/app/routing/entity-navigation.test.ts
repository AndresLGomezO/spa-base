import { describe, expect, it } from "vitest";

import {
  buildCurrentReturnTo,
  buildEntityListCreatePath,
  buildEntityListEditPath,
  buildEntityListPath,
  isSafeAppReturnTo,
  readReturnToFromLocation,
  resolveEntityListPath,
  resolveEntityReturnTo,
} from "./entity-navigation.js";

describe("entity-navigation", () => {
  it("builds entity list path", () => {
    expect(buildEntityListPath("contact")).toBe("/app/contact");
  });

  it("builds admin entity list path when browsing all entities", () => {
    expect(resolveEntityListPath("actor", "/app/all-entities/actor")).toBe(
      "/app/all-entities/actor",
    );
    expect(resolveEntityListPath("actor", "/app/actor")).toBe("/app/actor");
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
    expect(isSafeAppReturnTo("/notifications")).toBe(true);
    expect(isSafeAppReturnTo("/")).toBe(true);
    expect(isSafeAppReturnTo("/settings/design-layout")).toBe(true);
    expect(isSafeAppReturnTo("https://evil.example/app/contact")).toBe(false);
    expect(isSafeAppReturnTo("//evil.example/app/contact")).toBe(false);
    expect(isSafeAppReturnTo("/login")).toBe(false);
  });

  it("reads returnTo from location state when safe", () => {
    expect(
      readReturnToFromLocation({
        state: { returnTo: "/app/contact?q=foo" },
      }),
    ).toBe("/app/contact?q=foo");
    expect(
      readReturnToFromLocation({
        state: { returnTo: "/notifications" },
      }),
    ).toBe("/notifications");
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
    expect(
      resolveEntityReturnTo(
        {
          pathname: "/app/all-entities/contact/abc",
          search: "",
          state: null,
        },
        "contact",
      ),
    ).toBe("/app/all-entities/contact");
  });

  it("uses notifications returnTo from location state", () => {
    expect(
      resolveEntityReturnTo(
        {
          pathname: "/app/contact/abc",
          search: "",
          state: { returnTo: "/notifications" },
        },
        "contact",
      ),
    ).toBe("/notifications");
  });

  it("merges edit param without dropping list filters", () => {
    expect(
      buildEntityListEditPath(
        "contact",
        "rec-1",
        "/app/contact?q=foo&f.status=Open&page=2",
      ),
    ).toBe("/app/contact?q=foo&f.status=Open&page=2&edit=rec-1");
    expect(
      buildEntityListEditPath(
        "contact",
        "rec-1",
        "/app/all-entities/contact?q=foo&f.status=Open&page=2",
        "/app/all-entities/contact",
      ),
    ).toBe("/app/all-entities/contact?q=foo&f.status=Open&page=2&edit=rec-1");
  });

  it("builds edit path from bare list returnTo", () => {
    expect(buildEntityListEditPath("contact", "rec-1", "/app/contact")).toBe(
      "/app/contact?edit=rec-1",
    );
  });

  it("builds create path with prefill params", () => {
    expect(
      buildEntityListCreatePath("order", "/app/account", {
        accountId: "account-1",
      }),
    ).toBe("/app/order?create=&accountId=account-1");
  });

  it("merges create param without dropping list filters on same entity", () => {
    expect(
      buildEntityListCreatePath(
        "order",
        "/app/order?q=foo&f.status=Open&page=2",
        { accountId: "account-1" },
      ),
    ).toBe("/app/order?q=foo&f.status=Open&page=2&create=&accountId=account-1");
  });
});
