import { describe, expect, it } from "vitest";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

import { defineEntity, validateDesignLayoutSlice } from "@repo/entities";
import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

import { runOrchestrator } from "../../orchestrator.js";
import { formsSurfaceRecipe } from "./forms-recipe.js";
import { assembleFormsSliceData } from "./forms-assembler.js";
import {
  expandStepsAfterLayoutSkeleton,
  expandStepsAfterPresentation,
} from "./forms-plan.js";
import type { FormsUiBuilderDraft, SurfaceRecipeContext } from "../../types.js";

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
    views: [{ type: "table", name: "default", fields: ["name", "email"] }],
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

function buildFormsMockContext(
  draft: FormsUiBuilderDraft,
): SurfaceRecipeContext {
  return {
    surface: "forms",
    draft,
    entityFieldPaths: ["name", "email", "status"],
    fieldPathDefinition: {
      name: "widget",
      fields: {
        name: { type: "string" },
        email: { type: "string" },
        status: { type: "string" },
      },
    },
    layoutFieldPaths: [],
    tableFieldPaths: [],
    formFieldPaths: ["name", "email", "status"],
    formPresentation: draft.presentation ?? "plain",
    themeFragments: {},
    entityTenantFragment: "tenant",
    entityCatalogFragment: "catalog",
    entityCurrentFragment,
    userPrompt: "Design a form",
  };
}

describe("forms orchestrator plan", () => {
  it("expands plain presentation to root skeleton step", () => {
    const steps = expandStepsAfterPresentation("plain");
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("forms.layoutSkeleton");
    expect(steps[0]?.payload?.pathKey).toBe("plain.root");
  });

  it("expands configure steps after layout skeleton", () => {
    const steps = expandStepsAfterLayoutSkeleton("plain.root", [
      { kind: "form-field", fieldPath: "name" },
      { kind: "form-actions" },
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.type).toBe("forms.configureComponent");
  });
});

describe("forms assembler", () => {
  it("assembles plain form slice from draft", () => {
    const draft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "widget",
      userPrompt: "plain form",
      presentation: "plain",
      layoutTargets: {
        "plain.root": {
          pathKey: "plain.root",
          label: "Plain form root layout",
          skeleton: [
            { kind: "form-field", fieldPath: "name" },
            { kind: "form-field", fieldPath: "email" },
            { kind: "form-actions" },
          ],
          componentConfigs: {},
        },
      },
      completedStepIds: [],
    };

    const slice = assembleFormsSliceData(entity, draft);
    const validated = validateDesignLayoutSlice(entity, "forms", slice);
    expect(validated.ok).toBe(true);
    expect(slice.presentation).toBe("plain");
    expect(slice.layout).toBeDefined();
  });

  it("assembles wizard form slice from draft", () => {
    const draft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "widget",
      userPrompt: "wizard form",
      presentation: "wizard",
      wizardSteps: [{ id: "step-1", label: "Details" }],
      layoutTargets: {
        "wizard.shell": {
          pathKey: "wizard.shell",
          label: "Wizard shell layout",
          skeleton: [
            { kind: "wizard-progress" },
            { kind: "wizard-step-host" },
            { kind: "wizard-actions" },
          ],
          componentConfigs: {},
        },
        "wizard.steps[0]": {
          pathKey: "wizard.steps[0]",
          label: "Wizard step 1 layout",
          skeleton: [
            { kind: "form-field", fieldPath: "name" },
            { kind: "form-field", fieldPath: "email" },
          ],
          componentConfigs: {},
        },
      },
      completedStepIds: [],
    };

    const slice = assembleFormsSliceData(entity, draft);
    const validated = validateDesignLayoutSlice(entity, "forms", slice);
    expect(validated.ok).toBe(true);
    expect(slice.presentation).toBe("wizard");
    expect(slice.wizard?.steps).toHaveLength(1);
  });
});

describe("runOrchestrator mock vertex plain form flow", () => {
  it("completes plain form skeleton and configure steps", async () => {
    const initialDraft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "widget",
      userPrompt: "plain form",
      presentation: "plain",
      layoutTargets: {},
      completedStepIds: [],
    };

    let draft = initialDraft;

    const result = await runOrchestrator({
      vertexConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "mock",
        mockEnabled: true,
      },
      recipe: formsSurfaceRecipe,
      context: buildFormsMockContext(initialDraft),
      initialSteps: expandStepsAfterPresentation("plain"),
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async (nextDraft) => {
          draft = nextDraft as FormsUiBuilderDraft;
        },
      },
    });

    expect(result.output.stepCount).toBeGreaterThan(1);
    expect(draft.presentation).toBe("plain");
    expect(draft.layoutTargets["plain.root"]?.skeleton).toBeDefined();

    const slice = assembleFormsSliceData(entity, draft);
    expect(validateDesignLayoutSlice(entity, "forms", slice).ok).toBe(true);
  });
});
