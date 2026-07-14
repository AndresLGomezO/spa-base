import { describe, expect, it } from "vitest";

import {
  bindingMatchesMessage,
  buildGmailSearchQuery,
  findBestMatchingBinding,
  matchesFromAddress,
  matchesTextPattern,
  resolveMatchingBinding,
} from "./match.js";
import type { EmailMatchBinding } from "./types.js";

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

  it("matches Banco de Bogotá statement on from+subject+card last4", () => {
    expect(
      bindingMatchesMessage(
        {
          enabled: true,
          fromAddresses: ["extractos@bancodebogota.com.co"],
          subjectPatterns: ["Extracto Tarjeta de Crédito"],
          bodyPatterns: ["3075"],
        },
        {
          from: "Extractos <extractos@bancodebogota.com.co>",
          subject: "Extracto Tarjeta de Crédito 15 Abril 2026",
          snippet: "tarjeta de crédito terminada en 3075",
          bodyText:
            "tarjeta de crédito terminada en 3075, correspondiente al mes de Abril.",
        },
      ),
    ).toBe(true);
  });

  it("matches Davivienda statement on from+subject without body patterns", () => {
    expect(
      bindingMatchesMessage(
        {
          enabled: true,
          fromAddresses: ["bancodavivienda@davivienda.com"],
          subjectPatterns: ["Extracto tarjeta de Crédito Banco Davivienda"],
          bodyPatterns: [],
        },
        {
          from: "Banco Davivienda <bancodavivienda@davivienda.com>",
          subject: "Extracto tarjeta de Crédito Banco Davivienda 20260628",
          snippet: "Adjunto encontrará el extracto",
          bodyText: null,
        },
      ),
    ).toBe(true);
  });

  it("rejects Davivienda statement when a Visa/7185 body pattern is required but missing", () => {
    expect(
      bindingMatchesMessage(
        {
          enabled: true,
          fromAddresses: ["bancodavivienda@davivienda.com"],
          subjectPatterns: ["Extracto tarjeta de Crédito Banco Davivienda"],
          bodyPatterns: [
            "/Tarjeta de Cr[eé]dito Visa[\\s\\S]*7185|7185[\\s\\S]*Tarjeta de Cr[eé]dito Visa/i",
          ],
        },
        {
          from: "bancodavivienda@davivienda.com",
          subject: "Extracto tarjeta de Crédito Banco Davivienda 20260628",
          snippet: "Su extracto está listo",
          bodyText: null,
        },
      ),
    ).toBe(false);
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

function bindingFixture(
  overrides: Partial<EmailMatchBinding> &
    Pick<EmailMatchBinding, "id" | "recordId">,
): EmailMatchBinding {
  return {
    tenantId: "t",
    userId: "u",
    entityName: "item",
    enabled: true,
    fromAddresses: ["@bank.com"],
    subjectPatterns: [],
    bodyPatterns: [],
    createdAt: "a",
    updatedAt: "a",
    useAi: false,
    bodyFieldExtractors: [],
    ...overrides,
  };
}

describe("findBestMatchingBinding", () => {
  it("prefers more specific bindings", () => {
    const best = findBestMatchingBinding(
      [
        bindingFixture({
          id: "broad",
          recordId: "1",
          fromAddresses: ["@bank.com"],
        }),
        bindingFixture({
          id: "specific",
          recordId: "2",
          fromAddresses: ["alerts@bank.com"],
          subjectPatterns: ["purchase"],
        }),
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

describe("resolveMatchingBinding", () => {
  const preferred = bindingFixture({
    id: "reversal",
    recordId: "1",
    fromAddresses: ["alerts@bank.com"],
    subjectPatterns: ["alert"],
    bodyPatterns: ["reversed"],
  });
  const alternate = bindingFixture({
    id: "purchase",
    recordId: "2",
    fromAddresses: ["alerts@bank.com"],
    subjectPatterns: ["alert"],
    bodyPatterns: ["approved"],
  });
  const bindings = [preferred, alternate];

  it("uses preferred binding when it matches", () => {
    const resolved = resolveMatchingBinding(
      bindings,
      {
        from: "alerts@bank.com",
        subject: "Alert",
        snippet: "purchase reversed",
        bodyText: "purchase reversed",
      },
      "reversal",
    );
    expect(resolved?.id).toBe("reversal");
  });

  it("falls back when preferred catch-up binding does not match", () => {
    const resolved = resolveMatchingBinding(
      bindings,
      {
        from: "alerts@bank.com",
        subject: "Alert",
        snippet: "purchase approved",
        bodyText: "purchase approved",
      },
      "reversal",
    );
    expect(resolved?.id).toBe("purchase");
  });

  it("returns null when neither preferred nor any binding matches", () => {
    const resolved = resolveMatchingBinding(
      bindings,
      {
        from: "other@example.com",
        subject: "Hello",
        snippet: "",
      },
      "reversal",
    );
    expect(resolved).toBeNull();
  });
});
