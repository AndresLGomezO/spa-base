import { describe, expect, it } from "vitest";

import { coerceConfigureComponentOutput } from "./normalize-configure-component-output.js";
import { listSurfaceRecipe } from "./list-recipe.js";
import type { ListUiBuilderDraft, SurfaceRecipeContext } from "../../types.js";

describe("coerceConfigureComponentOutput", () => {
  it("accepts wrapped component output", () => {
    expect(
      coerceConfigureComponentOutput({
        component: {
          kind: "text",
          primary: { type: "field", path: "name" },
        },
      }),
    ).toEqual({
      component: {
        kind: "text",
        primary: { type: "field", path: "name" },
      },
    });
  });

  it("unwraps bare component objects", () => {
    expect(
      coerceConfigureComponentOutput({
        kind: "text",
        primary: { path: "name" },
      }),
    ).toEqual({
      component: {
        kind: "text",
        primary: { path: "name" },
      },
    });
  });

  it("unwraps row-wrapped component objects", () => {
    expect(
      coerceConfigureComponentOutput({
        type: "component",
        component: {
          kind: "badge",
          primary: { type: "field", path: "status" },
        },
      }),
    ).toEqual({
      component: {
        kind: "badge",
        primary: { type: "field", path: "status" },
      },
    });
  });

  it("unwraps nested data.component payloads", () => {
    expect(
      coerceConfigureComponentOutput({
        data: {
          component: {
            kind: "text",
            primary: { type: "field", path: "title" },
          },
        },
      }),
    ).toEqual({
      component: {
        kind: "text",
        primary: { type: "field", path: "title" },
      },
    });
  });

  it("returns null for invalid payloads", () => {
    expect(coerceConfigureComponentOutput(null)).toBeNull();
    expect(coerceConfigureComponentOutput({})).toBeNull();
    expect(coerceConfigureComponentOutput({ component: "text" })).toBeNull();
  });
});

describe("listSurfaceRecipe configureComponent validation", () => {
  const context: SurfaceRecipeContext = {
    surface: "list",
    draft: {
      surface: "list",
      entityName: "widget",
      userPrompt: "card",
      listViewType: "card",
      layoutTargets: {},
      completedStepIds: [],
    } satisfies ListUiBuilderDraft,
    entityFieldPaths: ["name"],
    fieldPathDefinition: {
      name: "widget",
      fields: { name: { type: "string" } },
    },
    layoutFieldPaths: ["name"],
    tableFieldPaths: ["name"],
    themeFragments: {},
    entityTenantFragment: "",
    entityCatalogFragment: "",
    entityCurrentFragment: "",
    userPrompt: "card",
  };

  it("accepts bare component objects from the model", () => {
    const step = {
      id: "list.configureComponent:listItem:root/0/col0/0",
      type: "list.configureComponent",
      label: "Configuring text component",
      phase: "component",
      payload: {
        pathKey: "listItem",
        componentPath: "root/0/col0/0",
        kind: "text",
        fieldPath: "name",
      },
    };

    const result = listSurfaceRecipe.validateStepOutput(
      step,
      {
        kind: "text",
        primary: { path: "name" },
        label: { show: true },
      },
      context,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { component: Record<string, unknown> };
      expect(data.component).toEqual({
        kind: "text",
        primary: { type: "field", path: "name" },
        label: { show: true },
      });
    }
  });
});
