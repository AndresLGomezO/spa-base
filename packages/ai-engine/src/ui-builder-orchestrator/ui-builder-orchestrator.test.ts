import { describe, expect, it, vi } from "vitest";
import {
  isContainerComponent,
  isGridComponent,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import { defineEntity, validateDesignLayoutSlice } from "@repo/entities";
import { type DefinedEntity, type FieldDefinitions } from "@repo/entities";

import { runOrchestrator } from "./orchestrator.js";
import { STEP_COOLDOWN_MS } from "./limits.js";
import * as vertexRetry from "../vertex-retry.js";
import { listSurfaceRecipe } from "./surfaces/list/list-recipe.js";
import { assembleListSliceData } from "./surfaces/list/list-assembler.js";
import type { ListUiBuilderDraft, SurfaceRecipeContext } from "./types.js";
import { expandStepsAfterLayoutSkeleton } from "./surfaces/list/list-plan.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    status: { type: "string" },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "status"],
      },
    ],
    forms: {
      create: {
        layout: createDefaultFormLayout(["name", "email", "status"]),
      },
      edit: {
        layout: createDefaultFormLayout(["name", "email", "status"]),
      },
    },
  },
});

const entity = Widget as unknown as AnyDefinedEntity;

const entityCurrentFragment = `# Entity widget
Fields:
- name (\`name\`)
- email (\`email\`)
- status (\`status\`)
`;

function buildMockContext(draft: ListUiBuilderDraft): SurfaceRecipeContext {
  const fieldPathDefinition = {
    name: "widget",
    fields: {
      name: { type: "string" },
      email: { type: "string" },
      status: { type: "string" },
    },
  };

  return {
    surface: "list",
    draft,
    entityFieldPaths: ["name", "email", "status"],
    fieldPathDefinition,
    layoutFieldPaths: ["name", "email", "status"],
    tableFieldPaths: ["name", "email", "status"],
    formFieldPaths: [],
    themeFragments: {},
    entityTenantFragment: "tenant",
    entityCatalogFragment: "catalog",
    entityCurrentFragment,
    userPrompt: "Design a list",
  };
}

describe("list orchestrator plan", () => {
  it("expands configure steps after layout skeleton", () => {
    const steps = expandStepsAfterLayoutSkeleton("listItem", [
      { kind: "text", fieldPath: "name" },
      { kind: "badge", fieldPath: "status" },
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.type).toBe("list.configureComponent");
  });

  it("assembles table slice from draft", () => {
    const draft: ListUiBuilderDraft = {
      surface: "list",
      entityName: "widget",
      userPrompt: "table",
      listViewType: "table",
      table: { fields: ["name", "email"], showActions: true },
      layoutTargets: {},
      completedStepIds: [],
    };
    const slice = assembleListSliceData(entity, draft);
    const validated = validateDesignLayoutSlice(entity, "list", slice);
    expect(validated.ok).toBe(true);
    expect(slice.listViewType).toBe("table");
    expect(slice.table.fields).toEqual(["name", "email"]);
  });
});

describe("runOrchestrator mock vertex table flow", () => {
  it("completes selectViewType and tableSelectFields steps", async () => {
    const initialDraft: ListUiBuilderDraft = {
      surface: "list",
      entityName: "widget",
      userPrompt: "table please",
      layoutTargets: {},
      completedStepIds: [],
    };

    const progressLabels: string[] = [];
    let draft = initialDraft;

    const result = await runOrchestrator({
      vertexConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "mock",
        mockEnabled: true,
      },
      recipe: listSurfaceRecipe,
      context: buildMockContext(initialDraft),
      callbacks: {
        onProgress: async (progress) => {
          progressLabels.push(progress.stepLabel);
        },
        onDraftUpdate: async (nextDraft) => {
          draft = nextDraft as ListUiBuilderDraft;
        },
      },
    });

    expect(result.output.stepCount).toBe(2);
    expect(draft.listViewType).toBe("table");
    expect(draft.table?.fields.length).toBeGreaterThan(0);
    expect(progressLabels).toEqual([
      "Selecting list presentation",
      "Choosing table columns",
    ]);

    const slice = assembleListSliceData(entity, draft);
    expect(validateDesignLayoutSlice(entity, "list", slice).ok).toBe(true);
  });

  it("waits between orchestrator steps when more steps remain", async () => {
    const sleepSpy = vi
      .spyOn(vertexRetry, "sleep")
      .mockResolvedValue(undefined);

    await runOrchestrator({
      vertexConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "mock",
        mockEnabled: true,
      },
      recipe: listSurfaceRecipe,
      context: buildMockContext({
        surface: "list",
        entityName: "widget",
        userPrompt: "table please",
        layoutTargets: {},
        completedStepIds: [],
      }),
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async () => {},
      },
    });

    expect(sleepSpy).toHaveBeenCalledWith(STEP_COOLDOWN_MS);
    sleepSpy.mockRestore();
  });
});

describe("layout skeleton repair", () => {
  it("repairs trackCount when assembling card layout", () => {
    const skeleton = [
      {
        kind: "grid" as const,
        trackCount: 3,
        tracks: [
          { components: [{ kind: "text" as const, fieldPath: "name" }] },
          { components: [{ kind: "text" as const, fieldPath: "status" }] },
        ],
      },
    ];
    const draft: ListUiBuilderDraft = {
      surface: "list",
      entityName: "widget",
      userPrompt: "card",
      listViewType: "card",
      layoutTargets: {
        listItem: {
          pathKey: "listItem",
          label: "Card",
          skeleton,
          componentConfigs: {
            "root/0/col0/0": {
              kind: "text",
              primary: { type: "field", path: "name" },
            },
            "root/0/col1/0": {
              kind: "text",
              primary: { type: "field", path: "status" },
            },
          },
        },
      },
      completedStepIds: [],
    };

    const slice = assembleListSliceData(entity, draft);
    const listItem = slice.listItem;
    const container = listItem
      ? resolveLayoutRootColumns(listItem)[0]?.rows[0]
      : undefined;
    expect(container?.type).toBe("component");
    if (
      container?.type === "component" &&
      isContainerComponent(container.component)
    ) {
      const gridRow = container.component.rows[0];
      expect(gridRow?.type).toBe("component");
      if (gridRow?.type === "component" && isGridComponent(gridRow.component)) {
        expect(gridRow.component.rows).toHaveLength(2);
      }
    }
    expect(validateDesignLayoutSlice(entity, "list", slice).ok).toBe(true);
  });
});
