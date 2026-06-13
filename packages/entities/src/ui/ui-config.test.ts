import {
  collectLayoutFieldPaths,
  createDefaultFormLayout,
  createDefaultModalFooterLayout,
  createDefaultWizardShellLayout,
  ensureWizardShellLayout,
} from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { getDefaultEntityUI } from "./default-ui-config.js";
import { serializeEntityDefinition } from "./serialize-entity-definition.js";
import { validateEntityUIConfig } from "./validate-ui-config.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "isActive"],
      },
    ],
    forms: {
      create: {
        layout: createDefaultFormLayout(["name", "email", "isActive"]),
      },
      edit: {
        layout: createDefaultFormLayout(["name", "email", "isActive"]),
      },
    },
    fields: {
      name: { label: "Name", component: "input" },
    },
  },
});

describe("validateEntityUIConfig", () => {
  it("accepts valid UI metadata", () => {
    expect(() =>
      validateEntityUIConfig(
        Widget as unknown as AnyDefinedEntity,
        Widget.metadata.ui!,
      ),
    ).not.toThrow();
  });

  it("rejects unknown view fields", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        views: [
          {
            type: "table",
            name: "default",
            fields: ["missingField"],
          },
        ],
      }),
    ).toThrow(/Invalid view "default" field "missingField"/);
  });

  it("rejects unknown field UI config keys", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          unknown: { label: "Bad" },
        },
      }),
    ).toThrow(/unknown field "unknown"/);
  });

  it("accepts display and date display format metadata", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          email: {
            displayFormat: "currency",
            dateDisplayFormat: "datetime",
          },
        },
      }),
    ).not.toThrow();
  });

  it("accepts field order metadata", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          name: { order: 0 },
          email: { order: 1 },
        },
      }),
    ).not.toThrow();
  });

  it("accepts forms.modalSize", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        forms: {
          ...Widget.metadata.ui!.forms,
          modalSize: "xl",
        },
      }),
    ).not.toThrow();
  });

  it("accepts wizard shell without wizard-actions when modal footer layout is configured", () => {
    const shellWithoutActions = ensureWizardShellLayout(
      {
        root: {
          type: "root",
          id: "root-1",
          columnCount: 2,
          columns: [
            {
              id: "col-left",
              rows: [
                {
                  type: "component",
                  id: "row-progress",
                  component: { kind: "wizard-progress" },
                },
              ],
            },
            {
              id: "col-right",
              rows: [
                {
                  type: "component",
                  id: "row-host",
                  component: { kind: "wizard-step-host" },
                },
              ],
            },
          ],
        },
      },
      { actionsInModalFooter: true },
    );

    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        forms: {
          ...Widget.metadata.ui!.forms,
          presentation: "wizard",
          modalFooterLayout: createDefaultModalFooterLayout("wizard-actions"),
          wizard: {
            shellLayout: shellWithoutActions,
            steps: [
              {
                id: "step-1",
                label: "Basic",
                layout: {
                  root: {
                    type: "root",
                    id: "root-step",
                    columnCount: 1,
                    columns: [{ id: "col-step", rows: [] }],
                  },
                },
              },
            ],
          },
        },
      }),
    ).not.toThrow();
  });

  it("accepts image and document field components", () => {
    const entity = defineEntity({
      name: "brand",
      fields: {
        name: { type: "string", required: true },
        logo: { type: "image" },
        brochure: { type: "document" },
      },
    });

    expect(() =>
      validateEntityUIConfig(entity as unknown as AnyDefinedEntity, {
        ...getDefaultEntityUI(entity as unknown as AnyDefinedEntity),
        fields: {
          logo: { component: "image" },
          brochure: { component: "document" },
        },
      }),
    ).not.toThrow();
  });

  it("accepts wizard step display paths with relation subfields", () => {
    const entity = defineEntity({
      name: "contract",
      fields: {
        name: { type: "string", required: true },
        categoryId: {
          type: "relation",
          relation: { target: "category", type: "many-to-one" },
        },
      },
    });

    expect(() =>
      validateEntityUIConfig(entity as unknown as AnyDefinedEntity, {
        ...getDefaultEntityUI(entity as unknown as AnyDefinedEntity),
        forms: {
          ...getDefaultEntityUI(entity as unknown as AnyDefinedEntity).forms,
          presentation: "wizard",
          wizard: {
            shellLayout: createDefaultWizardShellLayout(),
            steps: [
              {
                id: "step-review",
                label: "Review",
                layout: {
                  root: {
                    type: "root",
                    id: "root-step",
                    columnCount: 1,
                    columns: [
                      {
                        id: "col-step",
                        rows: [
                          {
                            type: "component",
                            id: "row-category",
                            component: {
                              kind: "text",
                              primary: {
                                type: "field",
                                path: "category.name",
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      }),
    ).not.toThrow();
  });

  it("accepts metric row layout with metric-widget slot", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        metricWidgets: [
          {
            id: "widget-1",
            name: "Total widgets",
            layout: {
              root: {
                type: "root",
                id: "root-widget",
                columnCount: 1,
                columns: [
                  {
                    id: "col-widget",
                    rows: [
                      {
                        type: "component",
                        id: "row-kpi",
                        component: {
                          kind: "metric-kpi",
                          metricDefinitionId: "total-widgets",
                          groupBindings: {},
                          dimensionBindings: {},
                          styles: [{ property: "padding", value: "12" }],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        metricRowLayout: {
          root: {
            type: "root",
            id: "root-row",
            columnCount: 1,
            columns: [
              {
                id: "col-row",
                rows: [
                  {
                    type: "component",
                    id: "row-widget",
                    component: {
                      kind: "metric-widget",
                      entityName: "widget",
                      widgetId: "widget-1",
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    ).not.toThrow();
  });
});

describe("serializeEntityDefinition", () => {
  it("includes file field metadata in catalog payload", () => {
    const defaultImage = {
      storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
      contentType: "image/png",
      fileName: "logo.png",
    };
    const entity = defineEntity({
      name: "brand",
      fields: {
        name: { type: "string", required: true },
        logo: {
          type: "image",
          maxSizeBytes: 2_097_152,
          defaultImage,
        },
      },
    });

    const serialized = serializeEntityDefinition(
      entity as unknown as AnyDefinedEntity,
    );

    expect(serialized.fields.logo).toMatchObject({
      type: "image",
      maxSizeBytes: 2_097_152,
      defaultImage,
    });
  });
});

describe("getDefaultEntityUI", () => {
  it("generates table and form layouts when ui is omitted", () => {
    const entity = defineEntity({
      name: "note",
      fields: {
        title: { type: "string", required: true },
        body: { type: "string" },
      },
    });

    const ui = getDefaultEntityUI(entity as unknown as AnyDefinedEntity);
    expect(ui.views[0]?.type).toBe("table");
    expect(ui.views[0]?.fields).toEqual(["title", "body"]);
    expect(collectLayoutFieldPaths(ui.forms.create.layout!)).toEqual([
      "title",
      "body",
    ]);
  });
});
