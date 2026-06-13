import type {
  DefinedEntity,
  FieldDefinitions,
  ListSliceData,
} from "@repo/entities";
import { validateDesignLayoutSlice } from "@repo/entities";
import { defineEntityFromRecord } from "@repo/dynamic-entities";

import type { VertexAiConfig } from "../../../vertex-ai.client.js";
import { runOrchestrator } from "../../orchestrator.js";
import type {
  ListUiBuilderDraft,
  OrchestratorCallbacks,
  SurfaceRecipeContext,
} from "../../types.js";
import { assembleListSliceData } from "./list-assembler.js";
import { listSurfaceRecipe } from "./list-recipe.js";
import {
  buildLayoutFieldPaths,
  buildTableFieldPaths,
  toFieldPathDefinition,
} from "./list-field-paths.js";

export interface RunListOrchestratorInput {
  readonly vertexConfig: VertexAiConfig;
  readonly entityName: string;
  readonly userPrompt: string;
  readonly currentLayoutJson?: string;
  readonly entityDefinition: Parameters<typeof defineEntityFromRecord>[0];
  readonly themeFragments: Record<string, string>;
  readonly entityTenantFragment: string;
  readonly entityCatalogFragment: string;
  readonly entityCurrentFragment: string;
  readonly entityFieldPaths: readonly string[];
  readonly callbacks: OrchestratorCallbacks;
}

export interface RunListOrchestratorResult {
  readonly output: { readonly summary: string; readonly stepCount: number };
  readonly draft: ListUiBuilderDraft;
  readonly sliceData: ListSliceData;
  readonly listViewType: ListUiBuilderDraft["listViewType"];
}

export async function runListUiBuilderOrchestrator(
  input: RunListOrchestratorInput,
): Promise<RunListOrchestratorResult> {
  const initialDraft: ListUiBuilderDraft = {
    surface: "list",
    entityName: input.entityName,
    userPrompt: input.userPrompt,
    ...(input.currentLayoutJson
      ? { currentLayoutJson: input.currentLayoutJson }
      : {}),
    layoutTargets: {},
    completedStepIds: [],
  };

  const entity = defineEntityFromRecord(
    input.entityDefinition,
  ) as DefinedEntity<string, FieldDefinitions>;
  const fieldPathDefinition = toFieldPathDefinition(entity);
  const layoutFieldPaths = buildLayoutFieldPaths(fieldPathDefinition);
  const tableFieldPaths = buildTableFieldPaths(fieldPathDefinition);

  const context: SurfaceRecipeContext = {
    surface: "list",
    draft: initialDraft,
    entityFieldPaths: input.entityFieldPaths,
    fieldPathDefinition,
    layoutFieldPaths,
    tableFieldPaths,
    themeFragments: input.themeFragments,
    entityTenantFragment: input.entityTenantFragment,
    entityCatalogFragment: input.entityCatalogFragment,
    entityCurrentFragment: input.entityCurrentFragment,
    userPrompt: input.userPrompt,
  };

  const result = await runOrchestrator({
    vertexConfig: input.vertexConfig,
    recipe: listSurfaceRecipe,
    context,
    callbacks: input.callbacks,
  });

  const draft = result.draft as ListUiBuilderDraft;
  const sliceData = assembleListSliceData(entity, draft);

  const validated = validateDesignLayoutSlice(entity, "list", sliceData);
  if (!validated.ok) {
    throw new Error(
      `Final assembly validation failed: ${validated.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}`,
    );
  }

  return {
    output: result.output,
    draft,
    sliceData: validated.data as ListSliceData,
    listViewType: draft.listViewType,
  };
}
