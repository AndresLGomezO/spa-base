import { describe, expect, it } from "vitest";

import {
  bindingMatchesMessage,
  buildGmailSearchQuery,
  findAllMatchingBindings,
  findBestMatchingBinding,
  matchesFromAddress,
  matchesTextPattern,
  resolveMatchingBinding,
  resolveMatchingBindings,
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
          fromAddresses: ["statements@bank.example.com"],
          subjectPatterns: ["Extracto Tarjeta de Crédito"],
          bodyPatterns: ["4242"],
        },
        {
          from: "Extractos <statements@bank.example.com>",
          subject: "Extracto Tarjeta de Crédito 15 Abril 2026",
          snippet: "tarjeta de crédito terminada en 4242",
          bodyText:
            "tarjeta de crédito terminada en 4242, correspondiente al mes de Abril.",
        },
      ),
    ).toBe(true);
  });

  it("matches Davivienda statement on from+subject without body patterns", () => {
    expect(
      bindingMatchesMessage(
        {
          enabled: true,
          fromAddresses: ["alerts@bank.example.com"],
          subjectPatterns: ["Extracto tarjeta de Crédito Banco Davivienda"],
          bodyPatterns: [],
        },
        {
          from: "Banco Davivienda <alerts@bank.example.com>",
          subject: "Extracto tarjeta de Crédito Banco Davivienda 20260628",
          snippet: "Adjunto encontrará el extracto",
          bodyText: null,
        },
      ),
    ).toBe(true);
  });

  it("rejects Davivienda statement when a Visa/4242 body pattern is required but missing", () => {
    expect(
      bindingMatchesMessage(
        {
          enabled: true,
          fromAddresses: ["alerts@bank.example.com"],
          subjectPatterns: ["Extracto tarjeta de Crédito Banco Davivienda"],
          bodyPatterns: [
            "/Tarjeta de Cr[eé]dito Visa[\\s\\S]*4242|4242[\\s\\S]*Tarjeta de Cr[eé]dito Visa/i",
          ],
        },
        {
          from: "alerts@bank.example.com",
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
    name: null,
    description: null,
    enabled: true,
    fromAddresses: ["@bank.com"],
    subjectPatterns: [],
    bodyPatterns: [],
    createdAt: "a",
    updatedAt: "a",
    useAi: false,
    bodyFieldExtractors: [],
    order: 100,
    ingestMode: "create",
    ...overrides,
  } as EmailMatchBinding;
}

describe("findAllMatchingBindings", () => {
  it("returns card + merchant-specific bindings for the same alert", () => {
    const card = bindingFixture({
      id: "card",
      recordId: "visa",
      fromAddresses: ["alerts@bank.example.com"],
      subjectPatterns: ["DAVIVIENDA"],
      bodyPatterns: [
        "/\\*{4}4242[\\s\\S]*Respuesta:\\s*Aprobado\\(a\\)|Respuesta:\\s*Aprobado\\(a\\)[\\s\\S]*\\*{4}4242/",
      ],
    });
    const netflix = bindingFixture({
      id: "netflix",
      recordId: "netflix",
      fromAddresses: ["alerts@bank.example.com"],
      subjectPatterns: ["DAVIVIENDA"],
      bodyPatterns: [
        "/\\*{4}4242[\\s\\S]*Respuesta:\\s*Aprobado\\(a\\)[\\s\\S]*NETFLIX|NETFLIX[\\s\\S]*\\*{4}4242[\\s\\S]*Respuesta:\\s*Aprobado\\(a\\)/i",
      ],
    });
    const reversal = bindingFixture({
      id: "reversal",
      recordId: "visa",
      fromAddresses: ["alerts@bank.example.com"],
      subjectPatterns: ["DAVIVIENDA"],
      bodyPatterns: [
        "/\\*{4}4242[\\s\\S]*Clase de Movimiento:\\s*Compra Reversada\\(o\\)|Clase de Movimiento:\\s*Compra Reversada\\(o\\)[\\s\\S]*\\*{4}4242/",
      ],
    });
    const message = {
      from: "alerts@bank.example.com",
      subject: "DAVIVIENDA alerta",
      snippet: "",
      bodyText:
        "****4242\nRespuesta: Aprobado(a)\nLugar de Transacción: NETFLIX.COM",
    };
    const all = findAllMatchingBindings([card, netflix, reversal], message);
    expect(all.map((binding) => binding.id)).toEqual(["card", "netflix"]);
  });

  it("returns a single binding when patterns are mutually exclusive", () => {
    const approved = bindingFixture({
      id: "approved",
      recordId: "1",
      fromAddresses: ["alerts@bank.com"],
      subjectPatterns: ["alert"],
      bodyPatterns: ["approved"],
    });
    const reversed = bindingFixture({
      id: "reversed",
      recordId: "1",
      fromAddresses: ["alerts@bank.com"],
      subjectPatterns: ["alert"],
      bodyPatterns: ["reversed"],
    });
    const all = findAllMatchingBindings([approved, reversed], {
      from: "alerts@bank.com",
      subject: "Alert",
      snippet: "purchase approved",
      bodyText: "purchase approved",
    });
    expect(all.map((binding) => binding.id)).toEqual(["approved"]);
  });
});

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

describe("resolveMatchingBindings", () => {
  it("returns every matching binding even when preferred is set", () => {
    const card = bindingFixture({
      id: "card",
      recordId: "visa",
      fromAddresses: ["@bank.com"],
      subjectPatterns: ["alert"],
      bodyPatterns: ["approved"],
      order: 0,
      ingestMode: "create",
    });
    const sub = bindingFixture({
      id: "sub",
      recordId: "netflix",
      fromAddresses: ["@bank.com"],
      subjectPatterns: ["alert"],
      bodyPatterns: ["approved", "NETFLIX"],
      order: 10,
      ingestMode: "link",
    });
    const all = resolveMatchingBindings(
      [card, sub],
      {
        from: "alerts@bank.com",
        subject: "alert",
        snippet: "approved NETFLIX",
        bodyText: "approved NETFLIX",
      },
      "card",
    );
    expect(all.map((binding) => binding.id).sort()).toEqual(["card", "sub"]);
  });

  it("sorts by order when callers sort after resolve", () => {
    const link = bindingFixture({
      id: "link",
      recordId: "netflix",
      order: 10,
      ingestMode: "link",
      fromAddresses: ["@bank.com"],
      subjectPatterns: ["alert"],
    });
    const create = bindingFixture({
      id: "create",
      recordId: "visa",
      order: 0,
      ingestMode: "create",
      fromAddresses: ["@bank.com"],
      subjectPatterns: ["alert"],
    });
    const sorted = [
      ...resolveMatchingBindings([link, create], {
        from: "alerts@bank.com",
        subject: "alert",
        snippet: "",
      }),
    ].sort((a, b) => a.order - b.order);
    expect(sorted.map((b) => b.id)).toEqual(["create", "link"]);
  });
});
