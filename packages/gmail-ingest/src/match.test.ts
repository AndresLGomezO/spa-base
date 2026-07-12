import { describe, expect, it } from "vitest";

import {
  bindingMatchesMessage,
  buildGmailSearchQuery,
  findBestMatchingBinding,
  matchesFromAddress,
  matchesTextPattern,
} from "./match.js";

describe("matchesFromAddress", () => {
  it("matches exact and domain senders", () => {
    expect(
      matchesFromAddress("Bank Alerts <alerts@bank.com>", "alerts@bank.com"),
    ).toBe(true);
    expect(
      matchesFromAddress("Bank Alerts <alerts@bank.com>", "@bank.com"),
    ).toBe(true);
    expect(matchesFromAddress("other@example.com", "@bank.com")).toBe(false);
  });
});

describe("matchesTextPattern", () => {
  it("supports contains and regex", () => {
    expect(matchesTextPattern("Payment received", "payment")).toBe(true);
    expect(matchesTextPattern("Pago #123", "/pago\\s+#\\d+/i")).toBe(true);
    expect(matchesTextPattern("hello", "world")).toBe(false);
  });
});

describe("bindingMatchesMessage", () => {
  it("requires all configured dimensions", () => {
    const ok = bindingMatchesMessage(
      {
        enabled: true,
        fromAddresses: ["@bank.com"],
        subjectPatterns: ["purchase"],
        bodyPatterns: [],
      },
      {
        from: "alerts@bank.com",
        subject: "Purchase approved",
        snippet: "ok",
      },
    );
    expect(ok).toBe(true);

    const no = bindingMatchesMessage(
      {
        enabled: true,
        fromAddresses: ["@bank.com"],
        subjectPatterns: ["purchase"],
        bodyPatterns: [],
      },
      {
        from: "alerts@bank.com",
        subject: "Statement ready",
        snippet: "ok",
      },
    );
    expect(no).toBe(false);
  });
});

describe("buildGmailSearchQuery", () => {
  it("builds OR query from bindings", () => {
    const query = buildGmailSearchQuery(
      [
        {
          enabled: true,
          fromAddresses: ["alerts@bank.com"],
          subjectPatterns: ["purchase"],
          gmailQueryExtra: null,
        },
      ],
      { afterDate: "2026/01/01" },
    );
    expect(query).toContain("from:alerts@bank.com");
    expect(query).toContain('subject:"purchase"');
    expect(query).toContain("after:2026/01/01");
  });
});

describe("findBestMatchingBinding", () => {
  it("prefers more specific bindings", () => {
    const best = findBestMatchingBinding(
      [
        {
          id: "broad",
          tenantId: "t",
          userId: "u",
          entityName: "item",
          recordId: "1",
          enabled: true,
          fromAddresses: ["@bank.com"],
          subjectPatterns: [],
          bodyPatterns: [],
          createdAt: "a",
          updatedAt: "a",
          useAi: false,
        },
        {
          id: "specific",
          tenantId: "t",
          userId: "u",
          entityName: "item",
          recordId: "2",
          enabled: true,
          fromAddresses: ["alerts@bank.com"],
          subjectPatterns: ["purchase"],
          bodyPatterns: [],
          createdAt: "a",
          updatedAt: "a",
          useAi: false,
        },
      ],
      {
        from: "alerts@bank.com",
        subject: "Purchase approved",
        snippet: "",
      },
    );
    expect(best?.id).toBe("specific");
  });
});
