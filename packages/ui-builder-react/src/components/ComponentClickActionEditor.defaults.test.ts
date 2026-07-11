import { describe, expect, it } from "vitest";

import {
  resolveDefaultEntityNavigation,
  sanitizeComponentClickAction,
} from "./ComponentClickActionEditor.js";

describe("resolveDefaultEntityNavigation", () => {
  it("prefers entity list + specific entity for app-shell style surfaces", () => {
    expect(
      resolveDefaultEntityNavigation({
        showCurrentRecordTarget: false,
        showListTargets: true,
        catalogEntityNames: ["paymentSchedule", "transaction"],
        relationFieldPaths: [],
      }),
    ).toEqual({
      destination: "entityList",
      scope: "entity",
      relationFieldPath: "",
      entityName: "paymentSchedule",
    });
  });

  it("uses current record when available", () => {
    expect(
      resolveDefaultEntityNavigation({
        showCurrentRecordTarget: true,
        showListTargets: false,
        catalogEntityNames: ["paymentSchedule"],
        relationFieldPaths: ["contactId"],
      }),
    ).toEqual({
      destination: "recordDetail",
      scope: "current",
      relationFieldPath: "contactId",
      entityName: "paymentSchedule",
    });
  });

  it("uses relation when there is no current record but relations exist", () => {
    expect(
      resolveDefaultEntityNavigation({
        showCurrentRecordTarget: false,
        showListTargets: false,
        catalogEntityNames: [],
        relationFieldPaths: ["contactId"],
      }),
    ).toEqual({
      destination: "recordDetail",
      scope: "relation",
      relationFieldPath: "contactId",
      entityName: "",
    });
  });
});

describe("sanitizeComponentClickAction", () => {
  it("rewrites empty relation targets to a specific entity", () => {
    expect(
      sanitizeComponentClickAction(
        {
          type: "entityView",
          view: "recordDetail",
          target: { scope: "relation", relationFieldPath: "" },
        },
        { fallbackEntityName: "paymentSchedule" },
      ),
    ).toEqual({
      type: "entityView",
      view: "recordDetail",
      target: { scope: "entity", entityName: "paymentSchedule" },
    });
  });

  it("clears invalid empty relation actions when no fallback exists", () => {
    expect(
      sanitizeComponentClickAction(
        {
          type: "entityView",
          view: "recordDetail",
          target: { scope: "relation", relationFieldPath: "   " },
        },
        { relationFieldPaths: [] },
      ),
    ).toBeUndefined();
  });

  it("leaves valid relation targets unchanged", () => {
    const action = {
      type: "entityView" as const,
      view: "recordDetail" as const,
      target: { scope: "relation" as const, relationFieldPath: "contactId" },
    };
    expect(sanitizeComponentClickAction(action)).toBe(action);
  });
});
