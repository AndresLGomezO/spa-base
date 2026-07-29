import { describe, expect, it } from "vitest";

import { computeReconciliationPlan } from "./reconcile.js";

describe("computeReconciliationPlan", () => {
  it("bootstraps default and mirror locales from harvested keys", () => {
    const plan = computeReconciliationPlan({
      harvested: {
        "entity.account.label": "Accounts",
        "entity.loan.label": "Loans",
      },
      existing: [],
      defaultLocale: "en",
      extraLocales: ["es"],
    });

    expect(plan.locales).toEqual(["en", "es"]);
    expect(plan.harvestedKeys).toEqual([
      "entity.account.label",
      "entity.loan.label",
    ]);
    expect(plan.nextMessages.en).toEqual({
      "entity.account.label": "Accounts",
      "entity.loan.label": "Loans",
    });
    expect(plan.nextMessages.es).toEqual({
      "entity.account.label": "",
      "entity.loan.label": "",
    });
    expect(plan.perLocale.es?.toAdd).toEqual([
      "entity.account.label",
      "entity.loan.label",
    ]);
    expect(plan.counts.added).toBe(4);
    expect(plan.counts.removed).toBe(0);
  });

  it("preserves mirror translations and drops stale keys", () => {
    const plan = computeReconciliationPlan({
      harvested: {
        "entity.account.label": "Accounts",
        "entity.loan.label": "Loans",
      },
      existing: [
        {
          locale: "en",
          messages: {
            "entity.account.label": "Old Accounts",
            "entity.gone.label": "Gone",
          },
        },
        {
          locale: "es",
          messages: {
            "entity.account.label": "Cuentas",
            "entity.gone.label": "Eliminado",
          },
        },
      ],
      defaultLocale: "en",
    });

    expect(plan.nextMessages.en).toEqual({
      "entity.account.label": "Accounts",
      "entity.loan.label": "Loans",
    });
    expect(plan.nextMessages.es).toEqual({
      "entity.account.label": "Cuentas",
      "entity.loan.label": "",
    });
    expect(plan.perLocale.en?.toRemove).toEqual(["entity.gone.label"]);
    expect(plan.perLocale.es?.toRemove).toEqual(["entity.gone.label"]);
    expect(plan.perLocale.es?.toAdd).toEqual(["entity.loan.label"]);
    expect(plan.perLocale.es?.toKeep).toEqual(["entity.account.label"]);
    expect(plan.counts.removed).toBe(2);
  });

  it("ensures extra locales even when packs already exist", () => {
    const plan = computeReconciliationPlan({
      harvested: { "k.a": "A" },
      existing: [{ locale: "en", messages: { "k.a": "A" } }],
      defaultLocale: "en",
      extraLocales: ["it"],
    });

    expect(plan.locales).toEqual(["en", "it"]);
    expect(plan.nextMessages.it).toEqual({ "k.a": "" });
  });
});
