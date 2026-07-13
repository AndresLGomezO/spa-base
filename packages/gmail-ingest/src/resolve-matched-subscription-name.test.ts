import { describe, expect, it } from "vitest";

import { resolveMatchedSubscriptionName } from "./resolve-matched-subscription-name.js";

const CHILDREN = [
  {
    name: "Netflix",
    status: "ACTIVE",
    billingAliases: ["NETFLIX"],
  },
  {
    name: "Apple iCloud",
    status: "ACTIVE",
    billingAliases: ["APPLE.COM/BILL"],
  },
  {
    name: "Google One",
    status: "ACTIVE",
    billingAliases: ["GOOGLE *GOOGLE ONE", "GOOGLE*GOOGLE ONE"],
  },
  {
    name: "Inactive Sub",
    status: "INACTIVE",
    billingAliases: ["NETFLIX"],
  },
] as const;

describe("resolveMatchedSubscriptionName", () => {
  it("matches exact aliases case-insensitively", () => {
    expect(
      resolveMatchedSubscriptionName({
        description: "netflix",
        children: CHILDREN,
      }),
    ).toBe("Netflix");
    expect(
      resolveMatchedSubscriptionName({
        description: "APPLE.COM/BILL",
        children: CHILDREN,
      }),
    ).toBe("Apple iCloud");
  });

  it("matches when description contains an alias", () => {
    expect(
      resolveMatchedSubscriptionName({
        description: "NETFLIX.COM",
        children: CHILDREN,
      }),
    ).toBe("Netflix");
    expect(
      resolveMatchedSubscriptionName({
        description: "GOOGLE *GOOGLE ONE STORAGE",
        children: CHILDREN,
      }),
    ).toBe("Google One");
  });

  it("prefers the longest alias substring on overlap", () => {
    expect(
      resolveMatchedSubscriptionName({
        description: "PAY GOOGLE*GOOGLE ONE",
        children: [
          {
            name: "Google Short",
            status: "ACTIVE",
            billingAliases: ["GOOGLE"],
          },
          {
            name: "Google One",
            status: "ACTIVE",
            billingAliases: ["GOOGLE*GOOGLE ONE"],
          },
        ],
      }),
    ).toBe("Google One");
  });

  it("skips inactive children and returns null when nothing matches", () => {
    expect(
      resolveMatchedSubscriptionName({
        description: "UBER RIDES",
        children: CHILDREN,
      }),
    ).toBeNull();
    expect(
      resolveMatchedSubscriptionName({
        description: "NETFLIX",
        children: [
          {
            name: "Inactive Sub",
            status: "INACTIVE",
            billingAliases: ["NETFLIX"],
          },
        ],
      }),
    ).toBeNull();
  });

  it("returns null for empty description", () => {
    expect(
      resolveMatchedSubscriptionName({
        description: "   ",
        children: CHILDREN,
      }),
    ).toBeNull();
  });
});
