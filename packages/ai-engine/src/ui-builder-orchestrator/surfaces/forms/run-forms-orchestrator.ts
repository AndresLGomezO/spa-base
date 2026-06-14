import type {
  DefinedEntity,
  FieldDefinitions,
  FormsSliceData,
} from "@repo/entities";
import { validateDesignLayoutSlice } from "@repo/entities";
import { defineEntityFromRecord } from "@repo/dynamic-entities";

import type { VertexAiConfig } from "../../../vertex-ai.client.js";
import { WIZARD_FIELD_THRESHOLD } from "../../limits.js";
import { runOrchestrator } from "../../orchestrator.js";
import type {
  FormPresentationChoice,
  FormsUiBuilderDraft,
  OrchestratorCallbacks,
  SurfaceRecipeContext,
} from "../../types.js";
import { assembleFormsSliceData } from "./forms-assembler.js";
import { formsSurfaceRecipe } from "./forms-recipe.js";
import {
  buildFormFieldPaths,
  toFieldPathDefinition,
} from "./forms-field-paths.js";
import {
  expandStepsAfterPresentation,
  shouldSkipPresentationSelection,
} from "./forms-plan.js";

export interface RunFormsOrchestratorInput {
  readonly vertexConfig: VertexAiConfig;
  readonly entityName: string;
  readonly userPrompt: string;
  readonly presentationHint?: FormPresentationChoice;
  readonly allowCreative?: boolean;
  readonly currentLayoutJson?: string;
  readonly entityDefinition: Parameters<typeof defineEntityFromRecord>[0];
  readonly themeFragments: Record<string, string>;
  readonly entityTenantFragment: string;
  readonly entityCatalogFragment: string;
  readonly entityCurrentFragment: string;
  readonly entityFieldPaths: readonly string[];
  readonly callbacks: OrchestratorCallbacks;
}

export interface RunFormsOrchestratorResult {
  readonly output: { readonly summary: string; readonly stepCount: number };
  readonly draft: FormsUiBuilderDraft;
  readonly sliceData: FormsSliceData;
  readonly presentation: FormsUiBuilderDraft["presentation"];
}

export async function runFormsUiBuilderOrchestrator(
  input: RunFormsOrchestratorInput,
): Promise<RunFormsOrchestratorResult> {
  const entity = defineEntityFromRecord(
    input.entityDefinition,
  ) as DefinedEntity<string, FieldDefinitions>;
  const fieldPathDefinition = toFieldPathDefinition(entity);
  const formFieldPaths = buildFormFieldPaths(fieldPathDefinition);
  const autoWizard = formFieldPaths.length >= WIZARD_FIELD_THRESHOLD;
  const skipSelection = shouldSkipPresentationSelection(
    formFieldPaths.length,
    input.presentationHint,
  );
  const initialPresentation: FormPresentationChoice | undefined = autoWizard
    ? "wizard"
    : skipSelection
      ? "wizard"
      : undefined;

  const initialDraft: FormsUiBuilderDraft = {
    surface: "forms",
    entityName: input.entityName,
    userPrompt: input.userPrompt,
    ...(input.currentLayoutJson
      ? { currentLayoutJson: input.currentLayoutJson }
      : {}),
    ...(initialPresentation ? { presentation: initialPresentation } : {}),
    layoutTargets: {},
    completedStepIds: [],
  };

  const context: SurfaceRecipeContext = {
    surface: "forms",
    draft: initialDraft,
    entityFieldPaths: input.entityFieldPaths,
    fieldPathDefinition,
    layoutFieldPaths: [],
    tableFieldPaths: [],
    formFieldPaths,
    ...(input.presentationHint
      ? { presentationHint: input.presentationHint }
      : {}),
    ...(input.allowCreative ? { allowCreative: true } : {}),
    ...(initialPresentation ? { formPresentation: initialPresentation } : {}),
    themeFragments: input.themeFragments,
    entityTenantFragment: input.entityTenantFragment,
    entityCatalogFragment: input.entityCatalogFragment,
    entityCurrentFragment: input.entityCurrentFragment,
    userPrompt: input.userPrompt,
  };

  const result = await runOrchestrator({
    vertexConfig: input.vertexConfig,
    recipe: formsSurfaceRecipe,
    context,
    callbacks: input.callbacks,
    ...(skipSelection && initialPresentation
      ? {
          initialSteps: expandStepsAfterPresentation(initialPresentation, {
            allowCreative: input.allowCreative,
          }),
        }
      : {}),
  });

  const draft = result.draft as FormsUiBuilderDraft;
  const sliceData = assembleFormsSliceData(entity, draft);

  const validated = validateDesignLayoutSlice(entity, "forms", sliceData);
  if (!validated.ok) {
    throw new Error(
      `Final assembly validation failed: ${validated.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}`,
    );
  }

  return {
    output: result.output,
    draft,
    sliceData: validated.data as FormsSliceData,
    presentation: draft.presentation,
  };
}

export { WIZARD_FIELD_THRESHOLD };
