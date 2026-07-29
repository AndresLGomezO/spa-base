import { describe, expect, it } from "vitest";

import {
  computeLocalePackCatalogReplacePlan,
  createLocalePacksCatalogEnvelope,
  parseLocalePackJson,
  parseLocalePacksCatalogJson,
} from "./locale-pack-json.js";
import {
  indexLocalePackMessages,
  resolveTenantLabel,
} from "./resolve-tenant-label.js";
import type { LocalePack } from "./types.js";

function pack(
  locale: string,
  messages: Record<string, string>,
  id = locale,
): LocalePack {
  return {
    id,
    tenantId: "t1",
    locale,
    messages,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("resolveTenantLabel", () => {
  it("prefers exact locale, then base, then en, then fallback", () => {
    const messages = indexLocalePackMessages([
      { locale: "en", messages: { "entity.account.label": "Accounts" } },
      {
        locale: "es",
        messages: { "entity.account.label": "Cuentas" },
      },
      {
        locale: "es-CO",
        messages: { "entity.account.label": "Cuentas (CO)" },
      },
    ]);

    expect(
      resolveTenantLabel(messages, "es-CO", "entity.account.label", "X"),
    ).toBe("Cuentas (CO)");
    expect(
      resolveTenantLabel(messages, "es-MX", "entity.account.label", "X"),
    ).toBe("Cuentas");
    expect(
      resolveTenantLabel(messages, "fr", "entity.account.label", "X"),
    ).toBe("Accounts");
    expect(resolveTenantLabel(messages, "fr", "missing.key", "Fallback")).toBe(
      "Fallback",
    );
  });

  it("skips empty translations", () => {
    const messages = indexLocalePackMessages([
      { locale: "en", messages: { k: "English" } },
      { locale: "es", messages: { k: "   " } },
    ]);
    expect(resolveTenantLabel(messages, "es", "k", "fb")).toBe("English");
  });
});

describe("locale pack JSON", () => {
  it("parses a singular envelope", () => {
    const result = parseLocalePackJson(
      JSON.stringify({
        kind: "locale-pack-definition",
        version: 1,
        data: {
          locale: "es",
          messages: { "entity.account.label": "Cuentas" },
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.locale).toBe("es");
      expect(result.data.messages["entity.account.label"]).toBe("Cuentas");
    }
  });

  it("rejects duplicate locales in a catalog", () => {
    const result = parseLocalePacksCatalogJson(
      JSON.stringify({
        kind: "locale-packs-catalog",
        version: 1,
        localePacks: [
          { locale: "en", messages: {} },
          { locale: "en", messages: {} },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("builds a replace plan by locale", () => {
    const plan = computeLocalePackCatalogReplacePlan({
      existing: [pack("en", { a: "1" }), pack("fr", { a: "1" })],
      imported: [
        { locale: "en", messages: { a: "2" } },
        { locale: "es", messages: { a: "3" } },
      ],
    });
    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toCreate[0]?.locale).toBe("es");
    expect(plan.toUpdate[0]?.existing.locale).toBe("en");
    expect(plan.toDelete[0]?.locale).toBe("fr");
  });

  it("creates a catalog envelope", () => {
    const envelope = createLocalePacksCatalogEnvelope([
      pack("en", { "sidebar.title": "Rates" }),
    ]);
    expect(envelope.kind).toBe("locale-packs-catalog");
    expect(envelope.localePacks).toHaveLength(1);
  });
});
