import { describe, expect, it } from "vitest";

import { assembleUiBuilderStepContext } from "@repo/ai-context";

import { formsSurfaceRecipe } from "./forms-recipe.js";
import { buildFormsStepContext } from "./forms-step-context.js";
import { FORMS_STEP_TYPES } from "./forms-steps.js";
import type { FormsUiBuilderDraft, SurfaceRecipeContext } from "../../types.js";

const entityCurrentFragment = `# Entity contract
Fields:
- name (\`name\`)
- status (\`status\`)
`;

function buildContext(draft: FormsUiBuilderDraft): SurfaceRecipeContext {
  return {
    surface: "forms",
    draft,
    entityFieldPaths: ["name", "status"],
    fieldPathDefinition: {
      name: "contract",
      fields: {
        name: { type: "string" },
        status: { type: "string" },
      },
    },
    layoutFieldPaths: [],
    tableFieldPaths: [],
    formFieldPaths: ["name", "status"],
    formPresentation: "wizard",
    themeFragments: {},
    entityTenantFragment: "tenant",
    entityCatalogFragment: "catalog",
    entityCurrentFragment,
    userPrompt: "Design a wizard form",
  };
}

describe("forms allocateFieldsToSteps context", () => {
  it("includes defined wizard steps block for allocate step", () => {
    const draft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "contract",
      userPrompt: "wizard",
      presentation: "wizard",
      wizardSteps: [
        { id: "step-1", label: "Basics" },
        { id: "step-2", label: "Review" },
      ],
      layoutTargets: {},
      completedStepIds: [],
    };

    const context = buildFormsStepContext(
      {
        id: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
        type: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
        label: "Allocating fields",
        phase: "wizard",
      },
      buildContext(draft),
    );

    const definedBlock = context.contextBlocks.find(
      (block) => block.id === "step.definedWizardSteps",
    );
    expect(definedBlock).toBeDefined();
    expect(definedBlock?.content).toContain("step-1");
    expect(definedBlock?.content).toContain("step-2");
  });
});

describe("forms allocateFieldsToSteps fallback", () => {
  it("uses deterministic allocation when LLM returns unknown step ids", () => {
    const draft: FormsUiBuilderDraft = {
      surface: "forms",
      entityName: "contract",
      userPrompt: "wizard",
      presentation: "wizard",
      wizardSteps: [
        { id: "step-1", label: "Basics" },
        { id: "step-2", label: "Details" },
        { id: "step-3", label: "Review" },
      ],
      layoutTargets: {},
      completedStepIds: [],
    };

    const result = formsSurfaceRecipe.validateStepOutput!(
      {
        id: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
        type: FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS,
        label: "Allocating fields",
        phase: "wizard",
      },
      {
        steps: [
          {
            id: "contract_basics",
            label: "Basics",
            fieldPaths: ["name"],
          },
          {
            id: "current_status",
            label: "Status",
            fieldPaths: ["status"],
          },
        ],
      },
      buildContext(draft),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as {
        steps: Array<{ id: string; fieldPaths: string[] }>;
        usedDeterministicFallback?: boolean;
      };
      expect(data.usedDeterministicFallback).toBe(true);
      expect(data.steps.map((step) => step.id)).toEqual([
        "step-1",
        "step-2",
        "step-3",
      ]);
      expect(data.steps.flatMap((step) => step.fieldPaths).sort()).toEqual([
        "name",
        "status",
      ]);
    }
  });
});

describe("forms blueprint system instruction", () => {
  it("uses creative system instruction for generateBlueprint step", () => {
    const assembled = assembleUiBuilderStepContext({
      stepType: FORMS_STEP_TYPES.GENERATE_BLUEPRINT,
      formPresentation: "wizard",
      taskDescription: "Draft blueprint",
      entityTenantFragment: "tenant",
      entityCatalogFragment: "catalog",
      entityCurrentFragment,
      themeFragments: {},
      userPrompt: "Creative wizard",
    });

    expect(assembled.systemInstruction).toContain("principal product designer");
    expect(assembled.systemInstruction).not.toContain("pixels for spacing");
  });

  it("uses strict system instruction for layout skeleton step", () => {
    const assembled = assembleUiBuilderStepContext({
      stepType: FORMS_STEP_TYPES.LAYOUT_SKELETON,
      formPresentation: "wizard",
      taskDescription: "Design skeleton",
      entityTenantFragment: "tenant",
      entityCatalogFragment: "catalog",
      entityCurrentFragment,
      themeFragments: {},
      userPrompt: "Wizard shell",
    });

    expect(assembled.systemInstruction).toContain(
      "normalised automatically later",
    );
    expect(assembled.systemInstruction).not.toContain(
      "select the single best presentation type",
    );
  });
});
