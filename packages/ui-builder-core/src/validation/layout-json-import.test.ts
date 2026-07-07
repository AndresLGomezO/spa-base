import { describe, expect, it } from "vitest";

import { createEmptyLayout } from "../builder/mutations.js";
import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import {
  createLayoutJsonSkeleton,
  validateLayoutJsonImport,
} from "./layout-json-import.js";
import { regenerateLayoutDocumentIds } from "./regenerate-layout-ids.js";

const definition = {
  name: "account",
  fields: {
    name: { type: "string" },
    balance: { type: "number" },
  },
};

describe("validateLayoutJsonImport", () => {
  it("accepts a valid layout document", () => {
    const skeleton = createLayoutJsonSkeleton(
      { type: "layout-document" },
      "listItem",
      "name",
    );
    const result = validateLayoutJsonImport(
      skeleton,
      { type: "layout-document" },
      {
        designSurface: "listItem",
        definition,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({
      root: { columns: [{ rows: [{ type: "component" }] }] },
    });
  });

  it("rejects invalid JSON syntax", () => {
    const result = validateLayoutJsonImport(
      "{",
      { type: "layout-document" },
      {
        designSurface: "listItem",
        definition,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.path).toBe("(parse)");
  });

  it("rejects disallowed component kinds for the surface", () => {
    const base = createEmptyLayout(1);
    const column = resolveLayoutRootColumns(base)[0];
    const layout =
      column == null
        ? base
        : {
            ...base,
            root: {
              ...base.root,
              columns: [
                {
                  ...column,
                  rows: [
                    {
                      type: "component" as const,
                      id: "row-1",
                      component: {
                        kind: "page-header" as const,
                      },
                    },
                  ],
                },
              ],
            },
          };

    const result = validateLayoutJsonImport(
      JSON.stringify(layout),
      { type: "layout-document" },
      { designSurface: "listItem", definition },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === "component.kind")).toBe(
      true,
    );
  });

  it("accepts query-viewer on metricWidget surface", () => {
    const base = createEmptyLayout(1);
    const column = resolveLayoutRootColumns(base)[0];
    const layout =
      column == null
        ? base
        : {
            ...base,
            root: {
              ...base.root,
              columns: [
                {
                  ...column,
                  rows: [
                    {
                      type: "component" as const,
                      id: "row-1",
                      component: {
                        kind: "query-viewer" as const,
                        entityQueryDefinitionId:
                          "Top outflow category (period)",
                        rows: [],
                      },
                    },
                  ],
                },
              ],
            },
          };

    const result = validateLayoutJsonImport(
      JSON.stringify(layout),
      { type: "layout-document" },
      { designSurface: "metricWidget", definition },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid field paths", () => {
    const base = createEmptyLayout(1);
    const column = resolveLayoutRootColumns(base)[0];
    const layout =
      column == null
        ? base
        : {
            ...base,
            root: {
              ...base.root,
              columns: [
                {
                  ...column,
                  rows: [
                    {
                      type: "component" as const,
                      id: "row-1",
                      component: {
                        kind: "text" as const,
                        primary: {
                          type: "field" as const,
                          path: "missingField",
                        },
                      },
                    },
                  ],
                },
              ],
            },
          };

    const result = validateLayoutJsonImport(
      JSON.stringify(layout),
      { type: "layout-document" },
      { designSurface: "listItem", definition },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === "fieldPath")).toBe(
      true,
    );
  });

  it("validates component-row scope", () => {
    const skeleton = createLayoutJsonSkeleton(
      { type: "component-row" },
      "listItem",
      "name",
    );
    const result = validateLayoutJsonImport(
      skeleton,
      { type: "component-row" },
      {
        designSurface: "listItem",
        definition,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ type: "component" });
  });

  it("validates insertable-row scope for component rows", () => {
    const componentRow = {
      type: "component" as const,
      id: "row-text",
      component: {
        kind: "text" as const,
        primary: { type: "static" as const, value: "Hello" },
      },
    };

    expect(
      validateLayoutJsonImport(
        JSON.stringify(componentRow),
        { type: "insertable-row" },
        { designSurface: "dashboardSection", definition },
      ).ok,
    ).toBe(true);

    expect(
      validateLayoutJsonImport(
        JSON.stringify({ type: "nested-layout", id: "legacy" }),
        { type: "insertable-row" },
        { designSurface: "dashboardSection", definition },
      ).ok,
    ).toBe(false);
  });

  it("accepts a single image component row on formWizardShell without wizard shell slots", () => {
    const row = {
      type: "component" as const,
      id: "row-image",
      component: {
        kind: "image" as const,
        primary: { type: "field" as const, path: "name" },
        imageSize: 48,
        styles: [{ property: "marginTop" as const, value: "8" }],
      },
      styles: [{ property: "paddingTop" as const, value: "4" }],
    };

    const result = validateLayoutJsonImport(
      JSON.stringify(row),
      { type: "component-row" },
      { designSurface: "formWizardShell", definition },
    );

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      type: "component",
      component: {
        kind: "image",
        imageSize: 48,
        styles: [{ property: "marginTop", value: "8" }],
      },
      styles: [{ property: "paddingTop", value: "4" }],
    });
  });

  it("still requires wizard shell slots for full layout-document imports", () => {
    const row = {
      type: "component" as const,
      id: "row-image",
      component: {
        kind: "image" as const,
        primary: { type: "field" as const, path: "name" },
      },
    };
    const layout = createEmptyLayout(1);
    const column = resolveLayoutRootColumns(layout)[0];
    const document =
      column == null
        ? layout
        : {
            ...layout,
            root: {
              ...layout.root,
              columns: [{ ...column, rows: [row] }],
            },
          };

    const result = validateLayoutJsonImport(
      JSON.stringify(document),
      { type: "layout-document" },
      { designSurface: "formWizardShell", definition },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.path === "wizardShell")).toBe(
      true,
    );
  });

  it("accepts wizard shell without wizard-actions when actions are in modal footer", () => {
    const document = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: { kind: "wizard-progress" as const },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-step-host" as const },
              },
            ],
          },
        ],
      },
    };

    const result = validateLayoutJsonImport(
      JSON.stringify(document),
      { type: "layout-document" },
      {
        designSurface: "formWizardShell",
        definition,
        actionsInModalFooter: true,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts wizard-progress bar variant with step label config", () => {
    const document = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: {
                  kind: "wizard-progress" as const,
                  variant: "bar" as const,
                  stepLabel: {
                    show: true,
                    position: "top" as const,
                    bold: true,
                    align: "left" as const,
                  },
                  barTrackColor: "muted" as const,
                  barFillColor: "primary" as const,
                },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-step-host" as const },
              },
              {
                type: "component" as const,
                id: "r3",
                component: { kind: "wizard-actions" as const },
              },
            ],
          },
        ],
      },
    };

    const result = validateLayoutJsonImport(
      JSON.stringify(document),
      { type: "layout-document" },
      {
        designSurface: "formWizardShell",
        definition,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts wizard-progress stepper variant with step labels and conditional styles", () => {
    const document = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: {
                  kind: "wizard-progress" as const,
                  variant: "stepper" as const,
                  stepLabel: {
                    show: true,
                    position: "bottom" as const,
                    align: "center" as const,
                  },
                  conditionalStyles: [
                    {
                      matchValue: "active",
                      background: "primary",
                      textColor: "default",
                    },
                    {
                      matchValue: "completed",
                      background: "success",
                      textColor: "default",
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-step-host" as const },
              },
              {
                type: "component" as const,
                id: "r3",
                component: { kind: "wizard-actions" as const },
              },
            ],
          },
        ],
      },
    };

    const result = validateLayoutJsonImport(
      JSON.stringify(document),
      { type: "layout-document" },
      {
        designSurface: "formWizardShell",
        definition,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts wizard-progress stepper variant with step labels and conditional styles", () => {
    const document = {
      root: {
        type: "root" as const,
        id: "root",
        columnCount: 2,
        columns: [
          {
            id: "c1",
            rows: [
              {
                type: "component" as const,
                id: "r1",
                component: {
                  kind: "wizard-progress" as const,
                  variant: "stepper" as const,
                  stepLabel: {
                    show: true,
                    position: "bottom" as const,
                    align: "center" as const,
                  },
                  conditionalStyles: [
                    {
                      matchValue: "active",
                      background: "primary",
                      textColor: "default",
                    },
                    {
                      matchValue: "completed",
                      background: "success",
                      textColor: "default",
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "c2",
            rows: [
              {
                type: "component" as const,
                id: "r2",
                component: { kind: "wizard-step-host" as const },
              },
              {
                type: "component" as const,
                id: "r3",
                component: { kind: "wizard-actions" as const },
              },
            ],
          },
        ],
      },
    };

    const result = validateLayoutJsonImport(
      JSON.stringify(document),
      { type: "layout-document" },
      {
        designSurface: "formWizardShell",
        definition,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("regenerateLayoutDocumentIds", () => {
  it("assigns fresh ids throughout the tree", () => {
    const layout = createEmptyLayout(1);
    const originalRootId = layout.root.id;
    const next = regenerateLayoutDocumentIds(layout);

    expect(next.root.id).not.toBe(originalRootId);
    const originalColumnId = resolveLayoutRootColumns(layout)[0]?.id;
    const nextColumns = resolveLayoutRootColumns(next);
    expect(nextColumns[0]?.id).not.toBe(originalColumnId);
  });
});
