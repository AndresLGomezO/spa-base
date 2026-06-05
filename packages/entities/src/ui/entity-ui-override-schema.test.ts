import { describe, expect, it } from "vitest";

import {
  parseEntityUiOverrideRecord,
  safeParseEntityUiOverrideRecord,
} from "./entity-ui-override-schema.js";

describe("entity ui override record parsing", () => {
  it("returns null for legacy override slices that no longer match the schema", () => {
    const record = safeParseEntityUiOverrideRecord("contract", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      listItem: {
        root: {
          type: "root",
          id: "root-1",
          columnCount: 1,
          columns: [
            {
              id: "col-1",
              rows: [
                {
                  type: "component",
                  id: "row-1",
                  component: {
                    kind: "unknown-kind",
                  },
                },
              ],
            },
          ],
        },
      },
      updatedAt: new Date().toISOString(),
    });

    expect(record).toBeNull();
  });

  it("parses wizard form overrides", () => {
    const record = parseEntityUiOverrideRecord("contract", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      forms: {
        presentation: "wizard",
        modalSize: "xl",
        wizard: {
          shellLayout: {
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
                      component: {
                        kind: "wizard-progress",
                      },
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
                    {
                      type: "component",
                      id: "row-actions",
                      component: { kind: "wizard-actions" },
                    },
                  ],
                },
              ],
            },
          },
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
      updatedAt: new Date().toISOString(),
    });

    expect(record.forms?.presentation).toBe("wizard");
    expect(record.forms?.wizard?.steps).toHaveLength(1);
  });

  it("parses modal chrome and footer layout overrides", () => {
    const record = parseEntityUiOverrideRecord("contract", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      forms: {
        modalChrome: { showHeader: false, contentPadding: "none" },
        modalFooterLayout: {
          root: {
            type: "root",
            id: "root-footer",
            columnCount: 1,
            columns: [
              {
                id: "col-footer",
                rows: [
                  {
                    type: "component",
                    id: "row-actions",
                    component: { kind: "wizard-actions" },
                  },
                ],
              },
            ],
          },
        },
      },
      updatedAt: new Date().toISOString(),
    });

    expect(record.forms?.modalChrome).toEqual({
      showHeader: false,
      contentPadding: "none",
    });
    expect(record.forms?.modalFooterLayout?.root.id).toBe("root-footer");
  });
});
