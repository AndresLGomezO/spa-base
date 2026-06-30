import { describe, expect, it } from "vitest";

import { uiLayoutDocumentSchema } from "./ui-layout-schema.js";

describe("uiLayoutDocumentSchema form-field hidden", () => {
  it("accepts hidden on form-field and entity-field-selector components", () => {
    const layout = {
      root: {
        type: "root",
        id: "root",
        columnCount: 1,
        columns: [
          {
            id: "col-1",
            rows: [
              {
                type: "component",
                id: "row-hidden-field",
                component: {
                  kind: "form-field",
                  fieldPath: "categoryId",
                  hidden: true,
                },
              },
              {
                type: "component",
                id: "row-hidden-selector",
                component: {
                  kind: "entity-field-selector",
                  fieldPath: "type",
                  layout: "list",
                  hidden: true,
                },
              },
            ],
          },
        ],
      },
    };

    expect(uiLayoutDocumentSchema.parse(layout)).toEqual(layout);
  });
});
