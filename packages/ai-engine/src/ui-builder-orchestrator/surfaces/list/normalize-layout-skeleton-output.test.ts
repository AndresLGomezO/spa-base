import { describe, expect, it } from "vitest";

import { layoutSkeletonOutputSchema } from "./list-steps.js";
import { coerceLayoutSkeletonOutput } from "./normalize-layout-skeleton-output.js";

describe("coerceLayoutSkeletonOutput", () => {
  it("strips full component props down to skeleton fields", () => {
    expect(
      coerceLayoutSkeletonOutput({
        components: [
          {
            kind: "text",
            primary: { type: "field", path: "name" },
            label: { show: true },
            id: "row-1",
          },
        ],
      }),
    ).toEqual({
      components: [{ kind: "text", fieldPath: "name" }],
    });
  });

  it("converts a full listItem layout document into skeleton components", () => {
    expect(
      coerceLayoutSkeletonOutput({
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
                    kind: "text",
                    primary: { type: "field", path: "name" },
                    label: { show: true },
                  },
                },
              ],
            },
          ],
        },
      }),
    ).toEqual({
      components: [{ kind: "text", fieldPath: "name" }],
    });
  });

  it("converts a container-root layout document into skeleton components", () => {
    expect(
      coerceLayoutSkeletonOutput({
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
                  id: "row-container",
                  component: {
                    kind: "container",
                    rows: [
                      {
                        type: "component",
                        id: "row-1",
                        component: {
                          kind: "text",
                          primary: { type: "field", path: "name" },
                          label: { show: true },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
    ).toEqual({
      components: [{ kind: "text", fieldPath: "name" }],
    });
  });

  it("normalizes nested-layout skeletons and repairs columnCount", () => {
    expect(
      coerceLayoutSkeletonOutput({
        components: [
          {
            kind: "nested-layout",
            columnCount: 3,
            columns: [
              {
                components: [{ kind: "text", fieldPath: "name" }],
              },
              {
                components: [{ kind: "badge", fieldPath: "status" }],
              },
            ],
          },
        ],
      }),
    ).toEqual({
      components: [
        {
          kind: "nested-layout",
          columnCount: 2,
          columns: [
            { components: [{ kind: "text", fieldPath: "name" }] },
            { components: [{ kind: "badge", fieldPath: "status" }] },
          ],
        },
      ],
    });
  });

  it("maps unknown component kinds to text when a field path is present", () => {
    expect(
      coerceLayoutSkeletonOutput({
        components: [{ kind: "form-field", fieldPath: "provider.name" }],
      }),
    ).toEqual({
      components: [{ kind: "text", fieldPath: "provider.name" }],
    });
  });

  it("accepts coerced full component props in the layout skeleton schema", () => {
    const coerced = coerceLayoutSkeletonOutput({
      components: [
        {
          kind: "text",
          primary: { type: "field", path: "name" },
          label: { show: true },
        },
      ],
    });
    expect(layoutSkeletonOutputSchema.safeParse(coerced).success).toBe(true);
  });
});
