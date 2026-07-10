import { describe, expect, it } from "vitest";

import { resolveEntityConditionalStyles } from "./resolve-entity-conditional-styles.js";

describe("resolveEntityConditionalStyles", () => {
  it("matches rules against per-rule compareFieldPath values", () => {
    const matched = resolveEntityConditionalStyles(
      [
        {
          compareFieldPath: "status",
          matchValue: "ACTIVE",
          styles: [{ property: "color", value: "success" }],
        },
        {
          compareFieldPath: "priority",
          matchValue: "high",
          styles: [{ property: "color", value: "danger" }],
        },
      ],
      {
        resolveField: (path) =>
          path === "status" ? "ACTIVE" : path === "priority" ? "low" : null,
        defaultCompareFieldPath: "dueDate",
      },
    );

    expect(matched.className).toContain("text-success");
  });

  it("falls back to defaultCompareFieldPath when compareFieldPath is omitted", () => {
    const matched = resolveEntityConditionalStyles(
      [{ matchValue: "7", styles: [{ property: "color", value: "warning" }] }],
      {
        resolveField: (path) => (path === "dueDate" ? "7" : null),
        defaultCompareFieldPath: "dueDate",
      },
    );

    expect(matched.className).toContain("text-warning");
  });

  it("uses daysRemaining thresholds for date compare fields", () => {
    const matched = resolveEntityConditionalStyles(
      [
        {
          compareFieldPath: "dueDate",
          matchValue: "<=7",
          styles: [{ property: "backgroundColor", value: "warning" }],
        },
      ],
      {
        resolveField: () => "2026-07-15T00:00:00.000Z",
        resolveFieldMeta: () => ({ fieldType: "date" }),
        referenceDate: new Date("2026-07-09T12:00:00.000Z"),
      },
    );

    expect(matched.className).toContain("bg-warning");
  });

  it("uses compareFieldDateFormat daysRemaining on the rule", () => {
    const matched = resolveEntityConditionalStyles(
      [
        {
          compareFieldPath: "dueDate",
          compareFieldDateFormat: "daysRemaining",
          matchValue: "<=7",
          styles: [{ property: "backgroundColor", value: "warning" }],
        },
      ],
      {
        resolveField: () => "2026-07-15T00:00:00.000Z",
        resolveFieldMeta: () => ({ fieldType: "date", dateDisplayFormat: "date" }),
        referenceDate: new Date("2026-07-09T12:00:00.000Z"),
      },
    );

    expect(matched.className).toContain("bg-warning");
    expect(matched.style?.backgroundColor).toContain("var(--color-warning)");
  });

  it("emits inline theme token backgrounds so conditional styles override shell classes", () => {
    const matched = resolveEntityConditionalStyles(
      [
        {
          compareFieldPath: "status",
          matchValue: "OVERDUE",
          styles: [{ property: "backgroundColor", value: "danger" }],
        },
      ],
      {
        resolveField: (path) => (path === "status" ? "OVERDUE" : null),
      },
    );

    expect(matched.className).toContain("bg-destructive/10");
    expect(matched.style?.backgroundColor).toContain("var(--color-destructive)");
  });

  it("emits inline theme token text colors for conditional rules", () => {
    const matched = resolveEntityConditionalStyles(
      [
        {
          compareFieldPath: "status",
          matchValue: "OVERDUE",
          styles: [{ property: "color", value: "danger" }],
        },
      ],
      {
        resolveField: (path) => (path === "status" ? "OVERDUE" : null),
      },
    );

    expect(matched.className).toContain("text-destructive");
    expect(matched.style?.color).toBe("var(--color-destructive)");
  });
});
